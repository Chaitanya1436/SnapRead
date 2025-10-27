const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const apiKeyToggle = document.getElementById('apiKeyToggle');
const userApiKeyBlock = document.getElementById('userApiKeyBlock');
const apiKeyInput = document.getElementById('apiKeyInput');
const apiKeySaveBtn = document.getElementById('apiKeySaveBtn');
const previewSection = document.getElementById('previewSection');
const imagePreview = document.getElementById('imagePreview');
const extractBtn = document.getElementById('extractBtn');
const spinner = document.getElementById('spinner');
const statusText = document.getElementById('statusText');
const resultSection = document.getElementById('resultSection');
const resultBox = document.getElementById('resultBox');
const copyBtn = document.getElementById('copyBtn');
const imageGrid = document.getElementById('imageGrid');
const viewMoreBtn = document.getElementById('viewMoreBtn');
const openCameraBtn = document.getElementById('openCameraBtn');
const cameraInput = document.getElementById('cameraInput');

let uploadedFile = null;
let base64Image = null;
let useUserApi = false;
let savedUserApiKey = '';
const defaultApiKey = "K85723050688957";

// Max file size 5MB
const maxAllowedSize = 5 * 1024 * 1024; 

// API key toggle
apiKeyToggle.addEventListener('change', () => {
    useUserApi = apiKeyToggle.checked;
    if (useUserApi) {
        userApiKeyBlock.classList.add('active');
    } else {
        userApiKeyBlock.classList.remove('active');
    }
});

apiKeySaveBtn.addEventListener('click', () => {
    if (apiKeyInput.value.trim()) {
        savedUserApiKey = apiKeyInput.value.trim();
        showStatus("Using custom API key!", false);
        userApiKeyBlock.classList.remove('active');
        apiKeyToggle.checked = false;
        useUserApi = false;
    } else {
        showStatus("Please enter your OCR.space API key", true);
    }
});

// Gallery setup
const totalGalleryImages = 40;
const imagesPerRow = 4;
let galleryRows = 3;

function getGalleryImageSrc(idx) {
    return `data/image${idx + 1}.jpg`;
}

function renderGallery() {
    imageGrid.innerHTML = '';
    const count = Math.min(galleryRows * imagesPerRow, totalGalleryImages);
    for (let i = 0; i < count; i++) {
        const img = document.createElement('img');
        img.src = getGalleryImageSrc(i);
        img.className = 'gallery-img';
        img.setAttribute('draggable', 'true');
        img.setAttribute('data-imgidx', i);
        img.title = `Handwritten Sample ${i + 1}`;
        img.style.opacity = '0';
        img.style.transform = `translateY(${20 + (Math.random() * 20)}px) scale(0.95)`;
        setTimeout(() => {
            img.style.transition = 'transform 0.7s cubic-bezier(.5,-0.13,.48,1.61), opacity 0.7s cubic-bezier(.5,-0.13,.48,1.61)';
            img.style.opacity = '1';
            img.style.transform = 'translateY(0) scale(1)';
        }, 80 + i * 60);
        img.addEventListener('dragstart', (ev) => {
            img.classList.add('dragging');
            ev.dataTransfer.setData('text/plain', img.src);
        });
        img.addEventListener('dragend', () => {
            img.classList.remove('dragging');
        });
        img.addEventListener('click', () => {
            previewSection.classList.add('active');
            resultSection.classList.remove('active');
            fetch(img.src)
                .then(resp => resp.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        base64Image = e.target.result;
                        imagePreview.src = base64Image;
                        imagePreview.style.display = 'block';
                    };
                    reader.readAsDataURL(blob);
                });
        });
        imageGrid.appendChild(img);
    }
    if (galleryRows * imagesPerRow < totalGalleryImages) {
        viewMoreBtn.style.display = 'inline-block';
    } else {
        viewMoreBtn.style.display = 'none';
    }
    if (galleryRows > 3) {
        viewMoreBtn.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}
viewMoreBtn.addEventListener('click', () => {
    galleryRows += 2;
    renderGallery();
});
renderGallery();

// Upload handling
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add("active");
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove("active");
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove("active");
    const src = e.dataTransfer.getData('text/plain');
    if (src) {
        fetch(src)
            .then(resp => resp.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onload = function (ev) {
                    base64Image = ev.target.result;
                    imagePreview.src = base64Image;
                    imagePreview.style.display = 'block';
                    previewSection.classList.add('active');
                    resultSection.classList.remove('active');
                };
                reader.readAsDataURL(blob);
            });
    }
});
uploadArea.addEventListener('click', () => {
    fileInput.click();
});
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > maxAllowedSize) {
            showStatus("File size exceeds 5MB limit.", true);
            fileInput.value = "";
            return;
        }
        uploadedFile = file;
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                base64Image = ev.target.result;
                imagePreview.src = base64Image;
                imagePreview.style.display = 'block';
                previewSection.classList.add('active');
                resultSection.classList.remove('active');
            };
            reader.readAsDataURL(file);
        } else {
            previewSection.classList.add('active');
            imagePreview.style.display = 'none';
            resultSection.classList.remove('active');
        }
    }
});

// Extract text button
extractBtn.addEventListener('click', async () => {
    let apiKey = defaultApiKey;
    if (savedUserApiKey) apiKey = savedUserApiKey;
    if (useUserApi && !apiKeyInput.value.trim()) {
        showStatus('Please enter your OCR.space API key', true);
        return;
    }
    if (useUserApi && apiKeyInput.value.trim()) {
        apiKey = apiKeyInput.value.trim();
    }
    if (!base64Image) {
        showStatus('Please upload or drag an image first', true);
        return;
    }
    extractBtn.disabled = true;
    spinner.classList.add('active');
    showStatus('Processing image... Please wait');
    resultSection.classList.remove('active');
    try {
        const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
        const formData = new FormData();
        formData.append('apikey', apiKey);
        formData.append('base64Image', 'data:image/png;base64,' + base64Data);
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('detectOrientation', 'true');
        formData.append('scale', 'true');
        formData.append('OCREngine', '2');
        const response = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: formData });
        const responseText = await response.text();
        if (responseText.trim().startsWith('<')) {
            throw new Error('Server returned HTML error page. CORS or API key issue. Try backend server.');
        }
        const result = JSON.parse(responseText);
        if (result.IsErroredOnProcessing) {
            throw new Error(result.ErrorMessage || 'OCR processing failed');
        }
        if (result.ParsedResults && result.ParsedResults.length > 0) {
            const text = result.ParsedResults[0].ParsedText;
            resultBox.textContent = (!text || text.trim() === '') ? 'No text detected in the image. Please try a clearer image.' : text;
            resultSection.classList.add('active');
            showStatus('Extraction Complete! ✅');
            setTimeout(() => { resultBox.scrollIntoView({ behavior: "smooth" }); }, 210);
        } else {
            throw new Error('No text found in the image');
        }
    } catch (error) {
        console.error('Error:', error);
        showStatus('Error: ' + error.message, true);
    } finally {
        extractBtn.disabled = false;
        spinner.classList.remove('active');
        setTimeout(() => { statusText.classList.remove('active'); }, 4000);
    }
});

// Copy text to clipboard
copyBtn.addEventListener('click', () => {
    const text = resultBox.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
    });
});

// Show status messages
function showStatus(message, isError = false) {
    statusText.textContent = message;
    statusText.classList.add('active');
    if (isError) {
        statusText.classList.add('error');
    } else {
        statusText.classList.remove('error');
    }
}

// Camera input button handling
openCameraBtn.addEventListener('click', () => {
    cameraInput.click();
});
cameraInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > maxAllowedSize) {
            showStatus("File size exceeds 5MB limit.", true);
            cameraInput.value = "";
            return;
        }
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                base64Image = ev.target.result;
                imagePreview.src = base64Image;
                imagePreview.style.display = 'block';
                previewSection.classList.add('active');
                resultSection.classList.remove('active');
            };
            reader.readAsDataURL(file);
        }
    }
});
