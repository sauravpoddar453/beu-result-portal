const fs = require('fs');
const path = require('path');
const axios = require('axios');

const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

async function generate() {
    try {
        const { data: courses } = await axios.get('https://beu-bih.ac.in/backend/v1/result/sem-get');
        
        let newUrls = [];
        
        for (const course of courses) {
            const courseSlug = course.courseName.replace(/\./g, '').toLowerCase(); // e.g., "btech"
            
            // To avoid duplicates, we use a Set for semester IDs
            const uniqueSemesters = new Set();
            for (const exam of course.exams) {
                uniqueSemesters.add(exam.semId);
            }
            
            for (const semId of uniqueSemesters) {
                const semOrdinal = getOrdinal(semId);
                let slug = `beu-${courseSlug}-${semOrdinal}-sem-result`;
                
                // Keep the old specific URLs backward compatible to avoid duplicate links or breaking old SEO
                if (courseSlug === 'btech' && semId === 4) slug = 'beu-4th-sem-result';
                if (courseSlug === 'btech' && semId === 6) slug = 'beu-6th-sem-result';
                
                newUrls.push(`https://spcreative.in/${slug}`);
                
                const dirPath = path.join(__dirname, 'src', 'app', slug);
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }
                
                const pageContent = `import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: "BEU ${course.courseName} ${semOrdinal} Semester Result",
  description: "Check official BEU ${course.courseName} ${semOrdinal} semester results online. Fast Bihar Engineering University result portal.",
};

export default function ResultPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1>BEU ${course.courseName} ${semOrdinal} Semester Result</h1>
      <p>Welcome to the official portal to check the Bihar Engineering University (BEU) ${semOrdinal} semester ${course.courseName} results.</p>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/" style={{ color: '#0070f3', textDecoration: 'underline' }}>
          Go back to Home to Check Result
        </Link>
      </div>
    </div>
  );
}
`;
                fs.writeFileSync(path.join(dirPath, 'page.tsx'), pageContent);
            }
        }
        
        console.log(`Generated ${newUrls.length} pages.`);
        
        // Read existing sitemap
        const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
        let sitemap = fs.readFileSync(sitemapPath, 'utf8');
        
        // Remove closing tag temporarily
        sitemap = sitemap.replace('</urlset>', '');
        
        // Extract existing URLs to avoid duplicates
        const existingUrlRegex = /<loc>(.*?)<\/loc>/g;
        const existingUrls = new Set();
        let match;
        while ((match = existingUrlRegex.exec(sitemap)) !== null) {
            existingUrls.add(match[1]);
        }
        
        let appendedCount = 0;
        for (const url of newUrls) {
            if (!existingUrls.has(url)) {
                sitemap += `
<url>
<loc>${url}</loc>
<priority>0.8</priority>
</url>
`;
                appendedCount++;
            }
        }
        
        sitemap += '\n</urlset>';
        fs.writeFileSync(sitemapPath, sitemap);
        
        console.log(`Appended ${appendedCount} new URLs to sitemap.xml.`);
        
    } catch (e) {
        console.error(e);
    }
}

generate();
