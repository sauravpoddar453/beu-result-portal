const fs = require('fs');
const path = require('path');

const dumpPath = path.join(__dirname, 'current_db_dump.json');
const rawData = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

// Deduplicate by regNo + clean semester number
const uniqueMap = new Map();
rawData.forEach(doc => {
  const semClean = (doc.semester || '6').toString().replace(/[^0-9]/g, '') || '6';
  const key = `${doc.regNo}_${semClean}`;
  if (!uniqueMap.has(key)) {
    uniqueMap.set(key, { ...doc, semesterClean: semClean });
  } else {
    // Keep the one with subjects array if the existing one doesn't have it
    const existing = uniqueMap.get(key);
    if ((!existing.subjects || existing.subjects.length === 0) && (doc.subjects && doc.subjects.length > 0)) {
      uniqueMap.set(key, { ...doc, semesterClean: semClean });
    }
  }
});

const records = Array.from(uniqueMap.values()).sort((a, b) => {
  // sort by regNo ascending
  return a.regNo.localeCompare(b.regNo);
});

console.log(`Processed ${records.length} unique student marksheet records.`);

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BEU Live Marksheets & Data Stream</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    /* Custom scrollbar for dense data tables */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(120, 120, 120, 0.3);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(120, 120, 120, 0.5);
    }
  </style>
</head>
<body class="bg-transparent text-[var(--foreground)] antialiased p-3 sm:p-5">
  <div class="max-w-7xl mx-auto space-y-5">
    
    <!-- Header Card -->
    <div class="bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2.5 mb-1.5">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1.5"></span>
              Live Data Browser Active
            </span>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-medium">
              BEU Patna • PCE Purnea (151)
            </span>
          </div>
          <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-[var(--foreground)]">
            BEU Examination Results & Marksheet Stream
          </h1>
          <p class="text-[var(--muted-foreground)] text-xs sm:text-sm mt-0.5">
            Automated marksheets fetched directly from Bihar Engineering University Portal for Purnea College of Engineering.
          </p>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex items-center gap-2 flex-wrap">
          <button onclick="toggleTerminal()" class="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors flex items-center gap-1.5 shadow-sm">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span id="termToggleLabel">Show Console Log</span>
          </button>
          <button onclick="exportCSV()" class="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 shadow-sm">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export CSV
          </button>
        </div>
      </div>

      <!-- Quick Metrics Ribbon -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-[var(--border)]">
        <div class="p-3 rounded-xl bg-[var(--background)]/60 border border-[var(--border)]">
          <span class="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider block">Total Fetched</span>
          <div class="text-xl font-bold text-[var(--foreground)] mt-0.5" id="metricTotal">0</div>
          <span class="text-[10px] text-emerald-500 font-medium">100% In Database</span>
        </div>
        <div class="p-3 rounded-xl bg-[var(--background)]/60 border border-[var(--border)]">
          <span class="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider block">Passed Count</span>
          <div class="text-xl font-bold text-emerald-600 mt-0.5" id="metricPassed">0</div>
          <span class="text-[10px] text-emerald-500 font-medium" id="metricPassRate">0% rate</span>
        </div>
        <div class="p-3 rounded-xl bg-[var(--background)]/60 border border-[var(--border)]">
          <span class="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider block">Backlog / Fail</span>
          <div class="text-xl font-bold text-rose-500 mt-0.5" id="metricFailed">0</div>
          <span class="text-[10px] text-rose-400 font-medium" id="metricFailRate">0% rate</span>
        </div>
        <div class="p-3 rounded-xl bg-[var(--background)]/60 border border-[var(--border)]">
          <span class="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider block">Avg SGPA</span>
          <div class="text-xl font-bold text-sky-500 mt-0.5" id="metricAvgSgpa">0.00</div>
          <span class="text-[10px] text-[var(--muted-foreground)]">Across all semesters</span>
        </div>
        <div class="p-3 rounded-xl bg-[var(--background)]/60 border border-[var(--border)]">
          <span class="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider block">College Highest</span>
          <div class="text-xl font-bold text-amber-500 mt-0.5" id="metricHighestSgpa">0.00</div>
          <span class="text-[10px] text-amber-500 truncate block" id="metricTopperName">Loading...</span>
        </div>
        <div class="p-3 rounded-xl bg-[var(--background)]/60 border border-[var(--border)]">
          <span class="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider block">Target College</span>
          <div class="text-sm font-bold text-indigo-500 truncate mt-1">PCE PURNEA</div>
          <span class="text-[10px] text-[var(--muted-foreground)]">College Code 151</span>
        </div>
      </div>
    </div>

    <!-- Live Console Log Drawer (Collapsible) -->
    <div id="terminalDrawer" class="hidden bg-slate-950 text-slate-100 border border-slate-800 rounded-2xl p-4 shadow-xl font-mono text-xs">
      <div class="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-rose-500"></span>
          <span class="w-3 h-3 rounded-full bg-amber-500"></span>
          <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span class="text-slate-400 font-medium ml-2">BEU Live Scraping Execution Log (Line by Line)</span>
        </div>
        <span class="text-emerald-400 font-medium text-[11px]">Stream: CONNECTED</span>
      </div>
      <div id="terminalOutput" class="h-48 overflow-y-auto space-y-1 text-slate-300 pr-2">
        <!-- Terminal lines injected via JS -->
      </div>
    </div>

    <!-- Search, Filters, and Sorters Bar -->
    <div class="bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
      <!-- Search -->
      <div class="relative flex-1">
        <svg class="w-4 h-4 absolute left-3 top-3 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input 
          id="searchInput" 
          type="text" 
          placeholder="Search by student name, roll number, or father's name..." 
          oninput="applyFilters()"
          class="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
      </div>

      <!-- Filters & Sort -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Semester Filter -->
        <select id="semFilter" onchange="applyFilters()" class="text-xs px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none">
          <option value="ALL">All Semesters</option>
          <option value="6">6th Semester Only</option>
          <option value="8">8th Semester Only</option>
        </select>

        <!-- Status Filter -->
        <select id="statusFilter" onchange="applyFilters()" class="text-xs px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none">
          <option value="ALL">All Results</option>
          <option value="PASSED">Passed Only</option>
          <option value="FAIL">Backlog / Failed Only</option>
        </select>

        <!-- Sort By -->
        <select id="sortBy" onchange="applyFilters()" class="text-xs px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none">
          <option value="ROLL_ASC">Roll No (Ascending)</option>
          <option value="SGPA_DESC">SGPA (Highest First)</option>
          <option value="CGPA_DESC">CGPA (Highest First)</option>
          <option value="NAME_ASC">Name (A-Z)</option>
        </select>
      </div>
    </div>

    <!-- Line-By-Line Results Feed -->
    <div class="bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
      <div class="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <h2 class="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
          <span>Detailed Student Records (Line-by-Line)</span>
          <span id="filteredCountBadge" class="text-xs px-2 py-0.5 rounded-full bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)] font-normal">0 records</span>
        </h2>
        <span class="text-xs text-[var(--muted-foreground)]">Click any row to expand subject marksheet</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-[var(--border)] bg-[var(--background)]/70 text-[var(--muted-foreground)] font-semibold uppercase text-[10px] tracking-wider">
              <th class="p-3 w-12 text-center">#</th>
              <th class="p-3">Registration No</th>
              <th class="p-3">Student & Father's Name</th>
              <th class="p-3">Semester</th>
              <th class="p-3 text-center">SGPA</th>
              <th class="p-3 text-center">CGPA</th>
              <th class="p-3 text-center">Status</th>
              <th class="p-3 text-center">Subjects</th>
              <th class="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody id="resultsTableBody" class="divide-y divide-[var(--border)]">
            <!-- Dynamic rows will be injected here -->
          </tbody>
        </table>
      </div>

      <!-- Empty state -->
      <div id="emptyState" class="hidden py-12 text-center space-y-2">
        <p class="text-sm font-semibold text-[var(--foreground)]">No matching student marksheets found</p>
        <p class="text-xs text-[var(--muted-foreground)]">Try clearing the search query or changing filter settings.</p>
      </div>
    </div>

  </div>

  <!-- Marksheet Modal Popup -->
  <div id="marksheetModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-3 sm:p-5">
    <div class="bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
      <button onclick="closeModal()" class="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>

      <div id="modalContent">
        <!-- Marksheet details populated dynamically -->
      </div>
    </div>
  </div>

  <script>
    // Embedded Live Data directly from database
    const rawData = ${JSON.stringify(records)};

    let currentList = [...rawData];

    // Initialize metrics
    function calculateMetrics(list) {
      const total = list.length;
      let passed = 0;
      let failed = 0;
      let sgpaSum = 0;
      let sgpaCount = 0;
      let highestSgpa = 0;
      let topper = 'N/A';

      list.forEach(item => {
        const isPass = (item.status || '').toUpperCase().includes('PASS');
        if (isPass) passed++; else failed++;

        const sgpaNum = parseFloat(item.sgpa);
        if (!isNaN(sgpaNum) && sgpaNum > 0) {
          sgpaSum += sgpaNum;
          sgpaCount++;
          if (sgpaNum > highestSgpa) {
            highestSgpa = sgpaNum;
            topper = item.name;
          }
        }
      });

      document.getElementById('metricTotal').innerText = total;
      document.getElementById('metricPassed').innerText = passed;
      document.getElementById('metricFailed').innerText = failed;
      document.getElementById('metricPassRate').innerText = total > 0 ? ((passed / total) * 100).toFixed(1) + '% pass rate' : '0%';
      document.getElementById('metricFailRate').innerText = total > 0 ? ((failed / total) * 100).toFixed(1) + '% backlog' : '0%';
      document.getElementById('metricAvgSgpa').innerText = sgpaCount > 0 ? (sgpaSum / sgpaCount).toFixed(2) : '0.00';
      document.getElementById('metricHighestSgpa').innerText = highestSgpa.toFixed(2);
      document.getElementById('metricTopperName').innerText = topper;
    }

    // Render Table Rows
    function renderTable(list) {
      const tbody = document.getElementById('resultsTableBody');
      const empty = document.getElementById('emptyState');
      tbody.innerHTML = '';

      document.getElementById('filteredCountBadge').innerText = list.length + ' records';

      if (list.length === 0) {
        empty.classList.remove('hidden');
        return;
      }
      empty.classList.add('hidden');

      list.forEach((item, index) => {
        const isPass = (item.status || '').toUpperCase().includes('PASS');
        const sgpaVal = parseFloat(item.sgpa) || 0;
        const cgpaVal = parseFloat(item.cgpa) || 0;

        let sgpaColor = 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        if (sgpaVal >= 8.5) sgpaColor = 'bg-purple-500/15 text-purple-600 border-purple-500/30 font-bold';
        else if (sgpaVal >= 7.5) sgpaColor = 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-bold';
        else if (sgpaVal >= 6.5) sgpaColor = 'bg-sky-500/15 text-sky-600 border-sky-500/30';
        else if (sgpaVal > 0) sgpaColor = 'bg-amber-500/15 text-amber-600 border-amber-500/30';

        const subjectsCount = (item.subjects && item.subjects.length) 
          || ((item.theorySubjects ? item.theorySubjects.length : 0) + (item.practicalSubjects ? item.practicalSubjects.length : 0))
          || 0;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-[var(--muted)]/50 transition-colors cursor-pointer group';
        tr.onclick = (e) => {
          if (e.target.tagName !== 'BUTTON') toggleRowDetails(index);
        };

        tr.innerHTML = \`
          <td class="p-3 text-center text-[var(--muted-foreground)] font-mono text-[11px]">\${index + 1}</td>
          <td class="p-3 font-mono font-semibold text-[var(--foreground)]">
            <span class="px-2 py-0.5 rounded bg-[var(--background)] border border-[var(--border)]">\${item.regNo}</span>
          </td>
          <td class="p-3">
            <div class="font-semibold text-[var(--foreground)] group-hover:text-indigo-600 transition-colors">\${item.name || 'N/A'}</div>
            <div class="text-[11px] text-[var(--muted-foreground)] truncate max-w-xs">Father: \${item.fatherName || 'N/A'}</div>
          </td>
          <td class="p-3">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              Sem \${item.semesterClean || item.semester}
            </span>
          </td>
          <td class="p-3 text-center">
            <span class="inline-block px-2.5 py-0.5 rounded-lg border text-xs font-semibold \${sgpaColor}">
              \${item.sgpa || 'N/A'}
            </span>
          </td>
          <td class="p-3 text-center font-semibold text-[var(--foreground)]">
            \${item.cgpa || 'N/A'}
          </td>
          <td class="p-3 text-center">
            \${isPass 
              ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">PASSED</span>'
              : \`<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-500 border border-rose-500/30 truncate max-w-[110px]" title="\${item.status}">\${item.status || 'FAIL'}</span>\`
            }
          </td>
          <td class="p-3 text-center text-[var(--muted-foreground)]">
            <span class="text-xs font-medium">\${subjectsCount} papers</span>
          </td>
          <td class="p-3 text-center">
            <button onclick="openModal(\${index}); event.stopPropagation();" class="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--background)] border border-[var(--border)] hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-colors">
              Marksheet
            </button>
          </td>
        \`;
        tbody.appendChild(tr);

        // Expandable Detail Row
        const detailTr = document.createElement('tr');
        detailTr.id = 'detailRow-' + index;
        detailTr.className = 'hidden bg-[var(--background)]/40 border-b border-[var(--border)]';

        const subjectsList = item.subjects && item.subjects.length > 0
          ? item.subjects
          : [...(item.theorySubjects || []), ...(item.practicalSubjects || [])];

        let subjectsHtml = '';
        if (subjectsList.length > 0) {
          subjectsHtml = \`
            <div class="p-4 space-y-3">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-[var(--foreground)]">Detailed Paper Breakdown:</span>
                <span class="text-[var(--muted-foreground)]">\${item.college || 'PURNEA COLLEGE OF ENGINEERING'}</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                \${subjectsList.map(s => \`
                  <div class="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] flex flex-col justify-between text-xs space-y-1">
                    <div class="flex items-start justify-between gap-1">
                      <span class="font-medium text-[var(--foreground)] truncate text-[11px]" title="\${s.name}">\${s.name}</span>
                      <span class="px-1.5 py-0.2 rounded text-[10px] font-mono \${(s.grade === 'F') ? 'bg-rose-500/20 text-rose-500 font-bold' : 'bg-emerald-500/15 text-emerald-600 font-bold'}">\${s.grade || 'P'}</span>
                    </div>
                    <div class="flex items-center justify-between text-[10px] text-[var(--muted-foreground)] pt-1 border-t border-[var(--border)]/50">
                      <span>Code: <code class="font-mono">\${s.code}</code></span>
                      <span>Marks: <strong class="text-[var(--foreground)]">\${s.total || s.point || '-'}</strong></span>
                      <span>Credit: \${s.credit || '-'}</span>
                    </div>
                  </div>
                \`).join('')}
              </div>
            </div>
          \`;
        } else {
          subjectsHtml = '<div class="p-4 text-xs text-[var(--muted-foreground)]">No subject level breakdown stored for this entry.</div>';
        }

        detailTr.innerHTML = \`<td colspan="9" class="p-0">\${subjectsHtml}</td>\`;
        tbody.appendChild(detailTr);
      });
    }

    function toggleRowDetails(index) {
      const row = document.getElementById('detailRow-' + index);
      if (row) {
        row.classList.toggle('hidden');
      }
    }

    // Filter and Sort Engine
    function applyFilters() {
      const q = document.getElementById('searchInput').value.toLowerCase().trim();
      const sem = document.getElementById('semFilter').value;
      const status = document.getElementById('statusFilter').value;
      const sort = document.getElementById('sortBy').value;

      let filtered = rawData.filter(item => {
        // Search query
        if (q) {
          const name = (item.name || '').toLowerCase();
          const reg = (item.regNo || '').toLowerCase();
          const father = (item.fatherName || '').toLowerCase();
          if (!name.includes(q) && !reg.includes(q) && !father.includes(q)) return false;
        }

        // Semester filter
        if (sem !== 'ALL') {
          if (item.semesterClean !== sem && !item.semester.includes(sem)) return false;
        }

        // Status filter
        if (status === 'PASSED') {
          if (!(item.status || '').toUpperCase().includes('PASS')) return false;
        } else if (status === 'FAIL') {
          if ((item.status || '').toUpperCase().includes('PASS')) return false;
        }

        return true;
      });

      // Sort
      filtered.sort((a, b) => {
        if (sort === 'ROLL_ASC') {
          return a.regNo.localeCompare(b.regNo);
        } else if (sort === 'SGPA_DESC') {
          return (parseFloat(b.sgpa) || 0) - (parseFloat(a.sgpa) || 0);
        } else if (sort === 'CGPA_DESC') {
          return (parseFloat(b.cgpa) || 0) - (parseFloat(a.cgpa) || 0);
        } else if (sort === 'NAME_ASC') {
          return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
      });

      currentList = filtered;
      renderTable(filtered);
    }

    // Marksheet Modal Popup
    function openModal(index) {
      const student = currentList[index];
      if (!student) return;

      const subjects = student.subjects && student.subjects.length > 0
        ? student.subjects
        : [...(student.theorySubjects || []), ...(student.practicalSubjects || [])];

      const modalHtml = \`
        <div class="space-y-4">
          <!-- Official BEU Marksheet Header -->
          <div class="text-center pb-4 border-b border-[var(--border)]">
            <span class="text-xs font-semibold uppercase tracking-wider text-indigo-500">BIHAR ENGINEERING UNIVERSITY, PATNA</span>
            <h3 class="text-lg font-bold text-[var(--foreground)] mt-0.5">GRADE CARD & STATEMENT OF MARKS</h3>
            <p class="text-xs text-[var(--muted-foreground)]">\${student.examName || 'B.Tech Semester Examination'}</p>
          </div>

          <!-- Student Profile Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[var(--background)]/70 border border-[var(--border)] text-xs">
            <div><span class="text-[var(--muted-foreground)] block text-[10px]">Student Name:</span><strong class="text-[var(--foreground)]">\${student.name || 'N/A'}</strong></div>
            <div><span class="text-[var(--muted-foreground)] block text-[10px]">Registration No:</span><strong class="text-[var(--foreground)] font-mono">\${student.regNo}</strong></div>
            <div><span class="text-[var(--muted-foreground)] block text-[10px]">Semester:</span><strong class="text-[var(--foreground)]">\${student.semesterClean || student.semester}th Semester</strong></div>
            <div><span class="text-[var(--muted-foreground)] block text-[10px]">Father's Name:</span><strong class="text-[var(--foreground)]">\${student.fatherName || 'N/A'}</strong></div>
            <div><span class="text-[var(--muted-foreground)] block text-[10px]">Mother's Name:</span><strong class="text-[var(--foreground)]">\${student.motherName || 'N/A'}</strong></div>
            <div><span class="text-[var(--muted-foreground)] block text-[10px]">College:</span><strong class="text-[var(--foreground)] truncate block">\${student.college || 'PCE Purnea'}</strong></div>
          </div>

          <!-- Marksheet Table -->
          <div class="border border-[var(--border)] rounded-xl overflow-hidden">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-[var(--background)] text-[var(--muted-foreground)] border-b border-[var(--border)] text-[10px] uppercase font-semibold">
                  <th class="p-2.5">Code</th>
                  <th class="p-2.5">Subject Title</th>
                  <th class="p-2.5 text-center">ESE</th>
                  <th class="p-2.5 text-center">IA</th>
                  <th class="p-2.5 text-center">Total</th>
                  <th class="p-2.5 text-center">Grade</th>
                  <th class="p-2.5 text-center">Credit</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--border)]">
                \${subjects.map(s => \`
                  <tr class="hover:bg-[var(--muted)]/40 transition-colors">
                    <td class="p-2.5 font-mono text-[11px]">\${s.code}</td>
                    <td class="p-2.5 font-medium">\${s.name}</td>
                    <td class="p-2.5 text-center font-mono">\${s.ese || '-'}</td>
                    <td class="p-2.5 text-center font-mono">\${s.ia || '-'}</td>
                    <td class="p-2.5 text-center font-mono font-semibold">\${s.total || s.point || '-'}</td>
                    <td class="p-2.5 text-center">
                      <span class="px-2 py-0.5 rounded text-[11px] font-bold font-mono \${s.grade === 'F' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/15 text-emerald-600'}">
                        \${s.grade || 'P'}
                      </span>
                    </td>
                    <td class="p-2.5 text-center font-mono">\${s.credit || '-'}</td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>

          <!-- Bottom Summary -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--background)]/70 border border-[var(--border)] text-xs">
            <div class="flex items-center gap-4">
              <div><span class="text-[var(--muted-foreground)] text-[10px] block">Semester SGPA</span><span class="text-base font-bold text-indigo-600">\${student.sgpa || 'N/A'}</span></div>
              <div><span class="text-[var(--muted-foreground)] text-[10px] block">Cumulative CGPA</span><span class="text-base font-bold text-[var(--foreground)]">\${student.cgpa || 'N/A'}</span></div>
              <div><span class="text-[var(--muted-foreground)] text-[10px] block">Final Status</span><span class="text-base font-bold \${(student.status || '').includes('PASS') ? 'text-emerald-600' : 'text-rose-500'}">\${student.status || 'PASSED'}</span></div>
            </div>
            <button onclick="window.print()" class="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors">
              Print Marksheet
            </button>
          </div>
        </div>
      \`;

      document.getElementById('modalContent').innerHTML = modalHtml;
      document.getElementById('marksheetModal').classList.remove('hidden');
    }

    function closeModal() {
      document.getElementById('marksheetModal').classList.add('hidden');
    }

    // Toggle Console Terminal
    function toggleTerminal() {
      const drawer = document.getElementById('terminalDrawer');
      const label = document.getElementById('termToggleLabel');
      drawer.classList.toggle('hidden');
      label.innerText = drawer.classList.contains('hidden') ? 'Show Console Log' : 'Hide Console Log';
    }

    // Populate Console Terminal lines
    function initTerminalLines() {
      const container = document.getElementById('terminalOutput');
      let html = '';
      rawData.forEach((item, idx) => {
        const time = new Date(item.lastUpdated || Date.now()).toLocaleTimeString();
        html += \`
          <div class="flex items-center justify-between py-0.5 border-b border-slate-900/60 hover:bg-slate-900/50 px-1 rounded">
            <div>
              <span class="text-slate-500">[\${time}]</span>
              <span class="text-emerald-400 font-semibold">[\${idx + 1}/\${rawData.length}]</span>
              <span class="text-slate-400 font-mono">\${item.regNo}</span>
              <span class="text-slate-200 font-semibold">\${item.name}</span>
              <span class="text-slate-400">| SGPA: \${item.sgpa} | CGPA: \${item.cgpa}</span>
            </div>
            <span class="\${(item.status || '').includes('PASS') ? 'text-emerald-400' : 'text-rose-400'} font-semibold">[\${item.status}]</span>
          </div>
        \`;
      });
      container.innerHTML = html;
    }

    // Export CSV
    function exportCSV() {
      const headers = ['RegNo', 'Name', 'FatherName', 'MotherName', 'College', 'Semester', 'SGPA', 'CGPA', 'Status'];
      const rows = currentList.map(r => [
        r.regNo,
        \`"\${(r.name || '').replace(/"/g, '""')}"\`,
        \`"\${(r.fatherName || '').replace(/"/g, '""')}"\`,
        \`"\${(r.motherName || '').replace(/"/g, '""')}"\`,
        \`"\${(r.college || '').replace(/"/g, '""')}"\`,
        r.semesterClean || r.semester,
        r.sgpa || '',
        r.cgpa || '',
        \`"\${(r.status || '').replace(/"/g, '""')}"\`
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "beu_pce_results.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Initial render
    calculateMetrics(rawData);
    renderTable(rawData);
    initTerminalLines();
  </script>
</body>
</html>
`;

const targetFile = 'C:\\\\Users\\\\Saurav\\\\.gemini\\\\antigravity\\\\brain\\\\968feea7-4f92-4c52-9793-36a990811327\\\\beu_result_browser.html';
fs.writeFileSync(targetFile, htmlContent, 'utf8');
console.log('Successfully written HTML artifact to:', targetFile);
