let pdfFiles = [];
let dragSrcIndex = null;

// Drag & Drop on drop zone
const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length) addFiles(files);
});

function handleFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type === 'application/pdf');
    if (files.length === 0) {
        showStatus('Please select PDF files only.', 'error');
        return;
    }
    addFiles(files);
}

function addFiles(files) {
    files.forEach(f => pdfFiles.push(f));
    renderFileList();
    document.getElementById('files-card').style.display = 'block';
    document.getElementById('status-card').style.display = 'none';
    // Reset file input
    document.getElementById('file-input').value = '';
}

function renderFileList() {
    const list = document.getElementById('file-list');
    list.innerHTML = '';
    pdfFiles.forEach((file, i) => {
        const sizeKB = (file.size / 1024).toFixed(0);
        const sizeMB = file.size > 1048576 ? (file.size / 1048576).toFixed(1) + ' MB' : sizeKB + ' KB';
        const div = document.createElement('div');
        div.className = 'file-item';
        div.draggable = true;
        div.dataset.index = i;
        div.innerHTML = `
            <span class="drag-handle">⠿</span>
            <span class="file-icon">📄</span>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-meta">${sizeMB}</div>
            </div>
            <span class="file-num">${i + 1}</span>
            <button class="remove-btn" onclick="removeFile(${i})">✕</button>
        `;
        // Drag reorder
        div.addEventListener('dragstart', () => { dragSrcIndex = i; div.classList.add('dragging'); });
        div.addEventListener('dragend', () => div.classList.remove('dragging'));
        div.addEventListener('dragover', e => { e.preventDefault(); div.classList.add('drag-over'); });
        div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
        div.addEventListener('drop', e => {
            e.preventDefault();
            div.classList.remove('drag-over');
            if (dragSrcIndex !== null && dragSrcIndex !== i) {
                const moved = pdfFiles.splice(dragSrcIndex, 1)[0];
                pdfFiles.splice(i, 0, moved);
                renderFileList();
            }
        });
        list.appendChild(div);
    });
}

function removeFile(index) {
    pdfFiles.splice(index, 1);
    if (pdfFiles.length === 0) {
        document.getElementById('files-card').style.display = 'none';
    } else {
        renderFileList();
    }
}

function clearAll() {
    pdfFiles = [];
    document.getElementById('files-card').style.display = 'none';
    document.getElementById('status-card').style.display = 'none';
}

async function mergePDFs() {
    if (pdfFiles.length < 2) {
        showStatus('Please add at least 2 PDF files to merge.', 'error');
        return;
    }

    const btn = document.getElementById('merge-btn');
    const btnText = document.getElementById('merge-btn-text');
    btn.disabled = true;
    btnText.textContent = '⏳ Merging...';
    showStatus('Merging your PDFs... Please wait.', 'processing');

    try {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        for (let i = 0; i < pdfFiles.length; i++) {
            btnText.textContent = `⏳ Processing file ${i + 1} of ${pdfFiles.length}...`;
            const arrayBuffer = await pdfFiles[i].arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }

        btnText.textContent = '⏳ Creating merged file...';
        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const outputName = (document.getElementById('output-name').value.trim() || 'merged') + '.pdf';
        const totalPages = mergedPdf.getPageCount();
        const sizeMB = (mergedPdfBytes.length / 1048576).toFixed(2);

        showStatus(`
            <div style="font-size:32px; margin-bottom:10px">✅</div>
            <div class="status-success">Merge Complete!</div>
            <div style="font-size:14px; color:#666; margin:8px 0">${pdfFiles.length} files merged • ${totalPages} pages • ${sizeMB} MB</div>
            <a href="${url}" download="${outputName}" class="download-btn">⬇️ Download ${outputName}</a>
        `, 'success');

    } catch (err) {
        showStatus(`❌ Error: ${err.message || 'Could not merge PDFs. Make sure the files are not password-protected.'}`, 'error');
    } finally {
        btn.disabled = false;
        btnText.textContent = '🔗 Merge PDFs';
    }
}

function showStatus(html, type) {
    const card = document.getElementById('status-card');
    card.style.display = 'block';
    card.innerHTML = html;
    card.className = 'status-card';
    if (type === 'error') card.style.borderLeft = '4px solid #e74c3c';
    else if (type === 'success') card.style.borderLeft = '4px solid #27ae60';
    else card.style.borderLeft = '4px solid #667eea';
}
