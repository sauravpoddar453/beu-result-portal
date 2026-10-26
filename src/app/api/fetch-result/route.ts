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
    const examNameParam = searchParams.get('exam_name') || searchParams.get('examName') || '';
    const examId = searchParams.get('exam_id') || searchParams.get('examId') || '';
    const isSuppRequest = (examNameParam && /supplementary|\(S\)/i.test(examNameParam)) || (examId && /98$/.test(examId));
    const captcha = searchParams.get('captcha');

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

      const semesterFilter = {
        $or: [
          { semester: normalizedSemester },
          { semester: `${normalizedSemester}th Semester` },
          { semester: `${normalizedSemester}st Semester` },
          { semester: `${normalizedSemester}nd Semester` },
          { semester: `${normalizedSemester}rd Semester` },
          { semester: new RegExp(`(^|\\b)${normalizedSemester}(\\b|th|st|nd|rd)`, 'i') }
        ]
      };

      if (isSuppRequest) {
        // Strictly look for Supplementary record in cache
        cachedResult = await Result.findOne({
          regNo,
          $and: [
            semesterFilter,
            {
              $or: [
                { isSupplementary: true },
                { examName: /supplementary/i },
                { examName: /\(S\)/i },
                { examId: /98$/ }
              ]
            }
          ]
        });
      } else {
        // Strictly look for Regular record in cache (exclude supplementary)
        cachedResult = await Result.findOne({
          regNo,
          $and: [
            semesterFilter,
            {
              $or: [
                { isSupplementary: { $ne: true } },
                { isSupplementary: { $exists: false } },
                { examName: { $not: /supplementary|\(S\)/i } },
                { examName: { $exists: false } }
              ]
            }
          ]
        });
        if (!cachedResult) {
          cachedResult = await Result.findOne({ regNo, ...semesterFilter });
          // If the only record found is actually marked supplementary, do not treat as regular cache hit
          if (cachedResult && (cachedResult.isSupplementary || (cachedResult.examName && /supplementary|\(S\)/i.test(cachedResult.examName)))) {
            cachedResult = null;
          }
        }
      }
    } catch (dbErr: any) {
      console.warn(`[Proxy Database Warning] DB connection/query failed: ${dbErr.message}. Bypassing cache...`);
    }

    if (cachedResult) {
      console.log(`[Proxy Cache HIT] regNo: ${regNo}, semester: ${normalizedSemester}`);
      const doc = cachedResult.toObject ? cachedResult.toObject() : cachedResult;

      // Ensure theorySubjects and practicalSubjects are populated if stored under 'subjects'
      if ((!doc.theorySubjects || doc.theorySubjects.length === 0) && doc.subjects && doc.subjects.length > 0) {
        doc.theorySubjects = doc.subjects
          .filter((s: any) => !s.code?.endsWith('P'))
          .map((s: any) => ({
            code: s.code,
            name: s.name,
            ese: s.ese || 'N/A',
            ia: s.ia || 'N/A',
            total: s.point !== undefined ? s.point.toString() : (s.total || 'N/A'),
            grade: s.grade,
            credit: s.credit
          }));
        doc.practicalSubjects = doc.subjects
          .filter((s: any) => s.code?.endsWith('P'))
          .map((s: any) => ({
            code: s.code,
            name: s.name,
            ese: s.ese || 'N/A',
            ia: s.ia || 'N/A',
            total: s.point !== undefined ? s.point.toString() : (s.total || 'N/A'),
            grade: s.grade,
            credit: s.credit
          }));
      }

      return NextResponse.json({
        status: 200,
        message: 'Report retrieved successfully.',
        data: doc
      });
    }

    console.log(`[Proxy Cache MISS] regNo: ${regNo}, semester: ${semester}. Fetching from official BEU API via HTTPS...`);

    const encodedExamHeld = encodeURIComponent(examHeld || '');
    const encodedExamName = encodeURIComponent(examNameParam || `B.Tech ${semesterNum}th Semester Examination ${year || '2026'}`);

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
      const tokenUrl = captcha 
        ? `https://beu-bih.ac.in/backend/v1/result/token?captcha=${encodeURIComponent(captcha)}`
        : 'https://beu-bih.ac.in/backend/v1/result/token';
      tokenData = await fetchJsonWithHttps(tokenUrl, headers);
    } catch (err: any) {
      throw new Error(`Failed to fetch secure token: ${err.message}`);
    }

    const token = tokenData?.token;
    if (!token) {
      throw new Error('Token was empty or not returned from university server');
    }

    // 4. Fetch actual result using the token
    const beuUrl = `https://beu-bih.ac.in/backend/v1/result/get-result?year=${year || ''}&redg_no=${regNo}&semester=${semester}&exam_held=${encodedExamHeld}&exam_id=${examId}&token=${token}`;
    
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
      examName: examNameParam || (isSuppRequest ? `B.Tech ${semesterNum}th Semester Supplementary Examination ${year || '2026'}` : `B.Tech ${semesterNum}th Semester Examination ${year || '2026'}`),
      examId: examId,
      isSupplementary: !!isSuppRequest,
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
          { regNo: mappedResult.regNo, semester: normalizedSemester, isSupplementary: !!isSuppRequest },
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
        error: 'CAPTCHA_REQUIRED',
        message: 'The university server requires CAPTCHA verification to fetch live results. Please solve the CAPTCHA.' 
      }, { status: 403 });
    }
    return NextResponse.json({ error: msg || 'Internal proxy error' }, { status: 500 });
  }
}
