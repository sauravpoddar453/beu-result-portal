import { NextResponse } from 'next/server';
import https from 'https';
import dbConnect from '@/lib/mongodb';
import Result from '@/models/Result';

const romanToNum = (roman: string): number => {
  if (!roman) return 1;
  const map: { [key: string]: number } = {
    'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8
  };
  return map[roman.trim().toUpperCase()] || parseInt(roman) || 1;
};

// Helper function to make raw HTTPS GET requests (bypasses Next.js fetch patches)
const fetchJsonWithHttps = (url: string, headers: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const options = {
      headers: headers,
      rejectUnauthorized: false // Avoid SSL handshake errors if any
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(JSON.parse(data));
          }
        } catch (e: any) {
          reject(new Error(`Failed to parse JSON: ${e.message} (Raw: ${data})`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const regNo = searchParams.get('redg_no') || searchParams.get('regNo');
    const semester = searchParams.get('semester');
    const examHeld = searchParams.get('exam_held') || searchParams.get('examHeld');

    if (!regNo || !semester) {
      return NextResponse.json({ error: 'Missing registration number or semester' }, { status: 400 });
    }

    // Normalize semester to match database format
    const semesterNum = romanToNum(semester);
    const normalizedSemester = semesterNum.toString();

    let cachedResult = null;
    let dbConnected = false;

    try {
      await dbConnect();
      dbConnected = true;
      // 1. Try querying our local database first (cached copy)
      cachedResult = await Result.findOne({ regNo, semester: normalizedSemester });
    } catch (dbErr: any) {
      console.warn(`[Proxy Database Warning] DB connection/query failed: ${dbErr.message}. Bypassing cache...`);
    }

    if (cachedResult) {
      console.log(`[Proxy Cache HIT] regNo: ${regNo}, semester: ${normalizedSemester}`);
      return NextResponse.json({
        status: 200,
        message: 'Report retrieved successfully.',
        data: cachedResult
      });
    }

    console.log(`[Proxy Cache MISS] regNo: ${regNo}, semester: ${semester}. Fetching from official BEU API via HTTPS...`);

    const encodedExamHeld = encodeURIComponent(examHeld || '');
    const encodedExamName = encodeURIComponent('B.Tech 1st Semester Examination 2025');

    // 2. Setup headers exactly mimicking the successful standalone script
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': `https://beu-bih.ac.in/result-three?name=${encodedExamName}&semester=${semester}&session=${year || '2025'}&regNo=${regNo}&exam_held=${encodedExamHeld}`,
      'Origin': 'https://beu-bih.ac.in',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    // 3. Fetch token
    let tokenData;
    try {
      tokenData = await fetchJsonWithHttps('https://beu-bih.ac.in/backend/v1/result/token', headers);
    } catch (err: any) {
      throw new Error(`Failed to fetch secure token: ${err.message}`);
    }

    const token = tokenData?.token;
    if (!token) {
      throw new Error('Token was empty or not returned from university server');
    }

    // 4. Fetch actual result using the token
    const beuUrl = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${year || ''}&redg_no=${regNo}&semester=${semester}&exam_held=${encodedExamHeld}&token=${token}`;
    
    let beuData;
    try {
      beuData = await fetchJsonWithHttps(beuUrl, headers);
    } catch (err: any) {
      throw new Error(`Failed to query result endpoint: ${err.message}`);
    }

    if (beuData.status !== 200 || !beuData.data) {
      return NextResponse.json({ error: beuData.message || 'Result not found on university server' }, { status: 404 });
    }

    const officialData = beuData.data;

    // 5. Map API data to our DB/UI structure
    const mappedResult = {
      regNo: officialData.redg_no?.toString() || regNo,
      name: officialData.name,
      fatherName: officialData.father_name,
      motherName: officialData.mother_name,
      college: officialData.college_name,
      semester: normalizedSemester, // Store numeric string '1', '2', etc.
      course: officialData.course,
      sgpa: Array.isArray(officialData.sgpa) ? (officialData.sgpa[semesterNum - 1] || 'N/A') : (officialData.sgpa || 'N/A'),
      allSgpa: Array.isArray(officialData.sgpa) ? officialData.sgpa : (officialData.sgpa ? [officialData.sgpa] : []),
      cgpa: officialData.cgpa,
      status: officialData.fail_any,
      theorySubjects: officialData.theorySubjects || [],
      practicalSubjects: officialData.practicalSubjects || [],
      lastUpdated: new Date()
    };

    // 6. Cache in MongoDB if database is connected
    if (dbConnected) {
      try {
        await Result.findOneAndUpdate(
          { regNo: mappedResult.regNo, semester: normalizedSemester },
          { $set: mappedResult },
          { upsert: true, new: true }
        );
        console.log(`[Proxy Cache Set] Successfully cached result for regNo: ${mappedResult.regNo}, semester: ${normalizedSemester} in MongoDB.`);
      } catch (dbErr: any) {
        console.error('Failed to cache result in MongoDB:', dbErr.message);
      }
    }

    // 7. Return data matching the expected shape
    return NextResponse.json({
      status: 200,
      message: 'Report retrieved successfully.',
      data: mappedResult
    });

  } catch (error: any) {
    console.error('Proxy fetch failed:', error.message);
    const msg = error.message || '';
    if (msg.includes('CAPTCHA') || msg.includes('403') || msg.includes('Forbidden')) {
      return NextResponse.json({ 
        error: 'The university server is temporarily rate-limiting requests (CAPTCHA required). Please try again in a few minutes or reset your internet connection to change your IP.' 
      }, { status: 429 });
    }
    return NextResponse.json({ error: msg || 'Internal proxy error' }, { status: 500 });
  }
}
