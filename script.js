// 获取DOM元素
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const controls = document.getElementById('controls');
const qualitySlider = document.getElementById('quality');
const qualityValue = document.getElementById('qualityValue');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const batchPreview = document.getElementById('batchPreview');
const batchList = document.getElementById('batchList');
const imageCount = document.getElementById('imageCount');
const format = document.getElementById('format');
const compressAllBtn = document.getElementById('compressAllBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const stats = document.getElementById('stats');
const toast = document.getElementById('toast');

// 存储待处理的图片
let imageQueue = [];
let processedImages = [];

// 初始化下载按钮状态
downloadAllBtn.disabled = true;

// 处理文件拖放
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#0071e3';
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#86868b';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#86868b';
    const files = e.dataTransfer.files;
    handleFiles(files);
});

// 处理点击上传
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// 处理文件选择
function handleFiles(files) {
    const validFiles = Array.from(files).filter(file => {
        if (!file.type.startsWith('image/')) {
            showError(`${file.name} 不是有效的图片文件`);
            return false;
        }
        return true;
    });

    if (validFiles.length === 0) {
        showError('请选择有效的图片文件');
        return;
    }

    imageQueue = [...imageQueue, ...validFiles];
    imageCount.textContent = imageQueue.length;
    updateBatchPreview();
    controls.style.display = 'block';
    batchPreview.style.display = 'block';
    downloadAllBtn.disabled = true;
}

// 更新批量预览
function updateBatchPreview() {
    batchList.innerHTML = '';
    imageQueue.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'batch-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <div class="item-info">
                    <div>${file.name}</div>
                    <div>大小: ${(file.size / 1024).toFixed(2)} KB</div>
                </div>
            `;
            batchList.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

// 显示错误信息
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 3000);
}

// 显示Toast提示
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 压缩单个图片
async function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // 显示原始图片预览
                const originalPreview = document.getElementById('originalPreview');
                originalPreview.src = e.target.result;
                document.getElementById('originalSize').textContent = 
                    `${(file.size / 1024).toFixed(2)} KB`;

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const quality = qualitySlider.value / 100;
                const outputFormat = format.value;
                const mimeType = `image/${outputFormat}`;
                
                canvas.toBlob((blob) => {
                    // 显示压缩后的预览
                    const compressedPreview = document.getElementById('compressedPreview');
                    compressedPreview.src = URL.createObjectURL(blob);
                    document.getElementById('compressedSize').textContent = 
                        `${(blob.size / 1024).toFixed(2)} KB`;

                    resolve({
                        blob,
                        originalSize: file.size,
                        compressedSize: blob.size,
                        name: file.name.replace(/\.[^/.]+$/, '') + '.' + outputFormat
                    });
                }, mimeType, quality);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// 压缩所有图片
async function compressAll() {
    if (imageQueue.length === 0) {
        showError('请先添加图片');
        return;
    }

    showLoading();
    processedImages = [];

    try {
        for (const file of imageQueue) {
            const result = await compressImage(file);
            processedImages.push(result);
        }

        updateStats();
        stats.style.display = 'block';
        showToast('压缩完成！');
        downloadAllBtn.disabled = false;
    } catch (error) {
        showError('压缩过程中出现错误');
        console.error(error);
    } finally {
        hideLoading();
    }
}

// 显示/隐藏加载动画
function showLoading() {
    if (loadingSpinner) {
        loadingSpinner.style.display = 'flex';
    }
}

function hideLoading() {
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
}

// 更新统计信息
function updateStats() {
    let totalOriginal = 0;
    let totalCompressed = 0;

    processedImages.forEach(img => {
        totalOriginal += img.originalSize;
        totalCompressed += img.compressedSize;
    });

    const savedSpace = totalOriginal - totalCompressed;
    const savingPercentage = ((savedSpace / totalOriginal) * 100).toFixed(1);

    document.getElementById('savedSpace').textContent = 
        `${(savedSpace / 1024).toFixed(2)} KB (${savingPercentage}%)`;
}

// 下载所有压缩后的图片
function downloadAll() {
    if (processedImages.length === 0) {
        showError('没有可下载的图片');
        return;
    }

    processedImages.forEach(img => {
        const link = document.createElement('a');
        link.download = img.name;
        link.href = URL.createObjectURL(img.blob);
        link.click();
        URL.revokeObjectURL(link.href);
    });

    showToast('开始下载！');
}

// 绑定按钮事件
compressAllBtn.addEventListener('click', compressAll);
downloadAllBtn.addEventListener('click', downloadAll);

// 格式变更时重新压缩
format.addEventListener('change', () => {
    if (processedImages.length > 0) {
        compressAll();
    }
});

// 质量滑块事件
qualitySlider.addEventListener('input', (e) => {
    qualityValue.textContent = `${e.target.value}%`;
    if (processedImages.length > 0) {
        compressAll();
    }
});

// 添加清除功能
function clearAll() {
    imageQueue = [];
    processedImages = [];
    if (batchList) {
        batchList.innerHTML = '';
    }
    if (imageCount) {
        imageCount.textContent = '0';
    }
    if (stats) {
        stats.style.display = 'none';
    }
    if (controls) {
        controls.style.display = 'none';
    }
    if (batchPreview) {
        batchPreview.style.display = 'none';
    }
    if (downloadAllBtn) {
        downloadAllBtn.disabled = true;
    }
}

// 添加清除按钮事件监听
const clearBtn = document.createElement('button');
clearBtn.textContent = '清除全部';
clearBtn.className = 'primary-btn';
clearBtn.style.marginLeft = '10px';
clearBtn.onclick = clearAll;

// 将清除按钮添加到按钮组
document.querySelector('.button-group').appendChild(clearBtn); 