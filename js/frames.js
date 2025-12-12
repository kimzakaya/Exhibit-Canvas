// ==================== 전역 변수 추가 ====================
let selectedFrames = []; // 다중 선택된 액자들
let guideLines = { horizontal: [], vertical: [] }; // 가이드 라인
const SNAP_THRESHOLD = 5; // 5px 이내면 스냅

// ==================== 액자 관리 ====================
function addFrame() {
    const nameInput = document.getElementById("frameName");
    const width = parseInt(document.getElementById("frameWidth").value);
    const height = parseInt(document.getElementById("frameHeight").value);

    const frameName = nameInput.value.trim() || `액자 ${frames.length + 1}`;
    nameInput.value = "";

    const frame = document.createElement("div");
    frame.className = "frame";
    frame.style.width = width + "px";
    frame.style.height = height + "px";
    frame.title = `${frameName} / ${width} × ${height} cm`;

    const id = Date.now();
    frame.dataset.id = id;
    frame.dataset.width = width;
    frame.dataset.height = height;

    frame.style.left = "20px";
    frame.style.top = "20px";

    addFrameEvents(frame);

    document.getElementById("wall").appendChild(frame);
    frames.push(frame);

    addFrameLayerItem(id, frameName, width, height);
    updateInfo();
}

function addFrameLayerItem(id, name, width, height) {
    const list = document.getElementById("frameLayerList");

    const item = document.createElement("div");
    item.className = "layer-item";
    item.dataset.id = id;

    item.innerHTML = `
        <span class="layer-name">${name}</span>
        <span class="layer-size">${width}×${height}</span>
    `;

    item.onclick = () => {
        const frame = document.querySelector(`.frame[data-id='${id}']`);
        if (frame) {
            frame.scrollIntoView({ behavior: "smooth", block: "center" });
            frame.style.outline = "3px solid #3498db";
            setTimeout(() => (frame.style.outline = "none"), 1000);
        }
    };

    list.appendChild(item);
}

function addFrameWithData(frameData) {
    const wall = document.getElementById('wall');
    
    const frame = document.createElement('div');
    frame.className = 'frame';
    frame.style.width = frameData.width + 'px';
    frame.style.height = frameData.height + 'px';
    frame.style.left = frameData.left + 'px';
    frame.style.top = frameData.top + 'px';
    frame.dataset.width = frameData.width;
    frame.dataset.height = frameData.height;
    
    if (frameData.image) {
        frame.style.backgroundImage = `url(${frameData.image})`;
        frame.style.backgroundSize = 'cover';
        frame.dataset.image = frameData.image;
    }
    frame.innerHTML = `<span>${frameData.width} × ${frameData.height} cm</span>`;
    
    frame.addEventListener('mousedown', startDrag);
    frame.addEventListener('click', selectFrame);
    frame.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showFrameContextMenu(e, frame);
    });
    
    wall.appendChild(frame);
    frames.push(frame);
    updateInfo();
    updateFrameLayerList();
}

function addFrameEvents(frame) {
    frame.addEventListener("click", (e) => {
        selectFrame(e);
    });

    frame.addEventListener("mousedown", (e) => {
        startDrag(e);
    });
    
    // 우클릭 메뉴
    frame.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 이미지 크롭 팝업 대신 컨텍스트 메뉴 표시
        showFrameContextMenu(e, frame);
    });
}

function startDrag(e) {
    // 우클릭은 무시
    if (e.button === 2) return;
    
    const clickedFrame = e.currentTarget;
    
    // 선택된 액자들 중 하나를 클릭한 경우 - 여러 액자 함께 드래그
    if (selectedFrames.length > 1 && selectedFrames.includes(clickedFrame)) {
        window.startMultiFrameDrag(e, clickedFrame);
        e.preventDefault();
        return;
    }
    
    // 단일 액자 드래그
    dragFrame = clickedFrame;
    
    const wall = document.getElementById('wall');
    const wallRect = wall.getBoundingClientRect();
    
    const currentLeft = parseFloat(dragFrame.style.left) || 0;
    const currentTop = parseFloat(dragFrame.style.top) || 0;
    
    const mouseXInWall = (e.clientX - wallRect.left) / wallEditorZoom - wallEditorPanX / wallEditorZoom;
    const mouseYInWall = (e.clientY - wallRect.top) / wallEditorZoom - wallEditorPanY / wallEditorZoom;
    
    offsetX = mouseXInWall - currentLeft;
    offsetY = mouseYInWall - currentTop;
    
    e.preventDefault();
}

function selectFrame(e) {
    const frame = e.currentTarget;
    
    // Ctrl/Cmd 키로 다중 선택
    if (e.ctrlKey || e.metaKey) {
        if (selectedFrames.includes(frame)) {
            selectedFrames = selectedFrames.filter(f => f !== frame);
            frame.classList.remove('selected');
        } else {
            selectedFrames.push(frame);
            frame.classList.add('selected');
        }
    } else {
        // 단일 선택
        selectedFrames.forEach(f => f.classList.remove('selected'));
        selectedFrames = [frame];
        frame.classList.add('selected');
    }
    
    selectedFrame = selectedFrames.length > 0 ? selectedFrames[0] : null;
}

// 액자 컨텍스트 메뉴
function showFrameContextMenu(e, frame) {
    const menu = document.getElementById('frameContextMenu');
    if (!menu) return;
    
    // 메뉴가 없으면 선택
    if (!selectedFrames.includes(frame)) {
        selectedFrames.forEach(f => f.classList.remove('selected'));
        selectedFrames = [frame];
        frame.classList.add('selected');
        selectedFrame = frame;
    }
    
    menu.style.left = `${e.pageX}px`;
    menu.style.top = `${e.pageY}px`;
    menu.classList.add('active');
    
    contextMenuTarget = frame;
}

function deleteSelectedFrames() {
    if (selectedFrames.length === 0) return;
    
    selectedFrames.forEach(frame => {
        frame.remove();
        frames = frames.filter(f => f !== frame);
    });
    
    selectedFrames = [];
    selectedFrame = null;
    updateInfo();
    updateFrameLayerList();
    
    // 컨텍스트 메뉴 닫기
    const menu = document.getElementById('frameContextMenu');
    if (menu) menu.classList.remove('active');
}

function attachImageToFrame() {
    if (!contextMenuTarget) return;
    selectedFrameForCrop = contextMenuTarget;
    openImageCropPopup();
    
    // 컨텍스트 메뉴 닫기
    const menu = document.getElementById('frameContextMenu');
    if (menu) menu.classList.remove('active');
}

function deleteFrame(e, frame) {
    e.stopPropagation();
    frame.remove();
    frames = frames.filter(f => f !== frame);
    selectedFrames = selectedFrames.filter(f => f !== frame);
    if (selectedFrame === frame) {
        selectedFrame = null;
    }
    updateInfo();
    updateFrameLayerList();
}

function clearAllFrames() {
    frames.forEach(frame => frame.remove());
    frames = [];
    selectedFrame = null;
    selectedFrames = [];
    updateInfo();
    updateFrameLayerList();
}

// ==================== 가이드 라인 시스템 ====================
function showGuideLines(draggedFrame, newX, newY) {
    removeGuideLines();
    
    const wall = document.getElementById('wall');
    const draggedWidth = draggedFrame.offsetWidth;
    const draggedHeight = draggedFrame.offsetHeight;
    
    // 드래그 중인 액자의 주요 포인트
    const draggedPoints = {
        left: newX,
        right: newX + draggedWidth,
        centerX: newX + draggedWidth / 2,
        top: newY,
        bottom: newY + draggedHeight,
        centerY: newY + draggedHeight / 2
    };
    
    let snappedX = newX;
    let snappedY = newY;
    let snapApplied = false;
    
    // 다른 액자들과 비교
    frames.forEach(frame => {
        if (frame === draggedFrame) return;
        
        const frameLeft = parseFloat(frame.style.left);
        const frameTop = parseFloat(frame.style.top);
        const frameWidth = frame.offsetWidth;
        const frameHeight = frame.offsetHeight;
        
        const framePoints = {
            left: frameLeft,
            right: frameLeft + frameWidth,
            centerX: frameLeft + frameWidth / 2,
            top: frameTop,
            bottom: frameTop + frameHeight,
            centerY: frameTop + frameHeight / 2
        };
        
        // 세로 정렬 체크 (좌/중앙/우)
        ['left', 'centerX', 'right'].forEach(point => {
            const diff = Math.abs(draggedPoints[point] - framePoints[point]);
            if (diff < SNAP_THRESHOLD) {
                createGuideLine('vertical', framePoints[point], '#e74c3c');
                snappedX = framePoints[point] - (draggedPoints[point] - newX);
                snapApplied = true;
            }
        });
        
        // 가로 정렬 체크 (상/중앙/하)
        ['top', 'centerY', 'bottom'].forEach(point => {
            const diff = Math.abs(draggedPoints[point] - framePoints[point]);
            if (diff < SNAP_THRESHOLD) {
                createGuideLine('horizontal', framePoints[point], '#27ae60');
                snappedY = framePoints[point] - (draggedPoints[point] - newY);
                snapApplied = true;
            }
        });
    });
    
    return snapApplied ? { x: snappedX, y: snappedY } : null;
}

function createGuideLine(type, position, color) {
    const wall = document.getElementById('wall');
    const line = document.createElement('div');
    line.className = `guide-line guide-line-${type}`;
    line.style.position = 'absolute';
    line.style.backgroundColor = color;
    line.style.pointerEvents = 'none';
    line.style.zIndex = '1000';
    line.style.opacity = '0.6';
    
    if (type === 'horizontal') {
        line.style.width = '100%';
        line.style.height = '1px';
        line.style.top = position + 'px';
        line.style.left = '0';
    } else {
        line.style.width = '1px';
        line.style.height = '100%';
        line.style.left = position + 'px';
        line.style.top = '0';
    }
    
    wall.appendChild(line);
    guideLines[type === 'horizontal' ? 'horizontal' : 'vertical'].push(line);
}

function removeGuideLines() {
    guideLines.horizontal.forEach(line => line.remove());
    guideLines.vertical.forEach(line => line.remove());
    guideLines.horizontal = [];
    guideLines.vertical = [];
}

// ==================== 정렬 및 분배 기능 ====================
function alignFrames(type) {
    if (selectedFrames.length < 2) {
        alert('2개 이상의 액자를 선택해주세요.\n(Ctrl+클릭으로 여러 액자 선택)');
        return;
    }
    
    switch(type) {
        case 'top':
            alignTop();
            break;
        case 'bottom':
            alignBottom();
            break;
        case 'left':
            alignLeft();
            break;
        case 'right':
            alignRight();
            break;
        case 'centerX':
            alignCenterX();
            break;
        case 'centerY':
            alignCenterY();
            break;
        case 'distributeX':
            distributeX();
            break;
        case 'distributeY':
            distributeY();
            break;
    }
}

function alignTop() {
    const minTop = Math.min(...selectedFrames.map(f => parseFloat(f.style.top)));
    selectedFrames.forEach(frame => {
        frame.style.top = minTop + 'px';
    });
}

function alignBottom() {
    const maxBottom = Math.max(...selectedFrames.map(f => 
        parseFloat(f.style.top) + f.offsetHeight
    ));
    selectedFrames.forEach(frame => {
        frame.style.top = (maxBottom - frame.offsetHeight) + 'px';
    });
}

function alignLeft() {
    const minLeft = Math.min(...selectedFrames.map(f => parseFloat(f.style.left)));
    selectedFrames.forEach(frame => {
        frame.style.left = minLeft + 'px';
    });
}

function alignRight() {
    const maxRight = Math.max(...selectedFrames.map(f => 
        parseFloat(f.style.left) + f.offsetWidth
    ));
    selectedFrames.forEach(frame => {
        frame.style.left = (maxRight - frame.offsetWidth) + 'px';
    });
}

function alignCenterX() {
    const totalWidth = selectedFrames.reduce((sum, f) => 
        sum + parseFloat(f.style.left) + f.offsetWidth / 2, 0
    );
    const avgCenterX = totalWidth / selectedFrames.length;
    
    selectedFrames.forEach(frame => {
        frame.style.left = (avgCenterX - frame.offsetWidth / 2) + 'px';
    });
}

function alignCenterY() {
    const totalHeight = selectedFrames.reduce((sum, f) => 
        sum + parseFloat(f.style.top) + f.offsetHeight / 2, 0
    );
    const avgCenterY = totalHeight / selectedFrames.length;
    
    selectedFrames.forEach(frame => {
        frame.style.top = (avgCenterY - frame.offsetHeight / 2) + 'px';
    });
}

function distributeX() {
    if (selectedFrames.length < 3) {
        alert('균등 분배는 3개 이상의 액자가 필요합니다.');
        return;
    }
    
    const sorted = [...selectedFrames].sort((a, b) => 
        parseFloat(a.style.left) - parseFloat(b.style.left)
    );
    
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const firstLeft = parseFloat(first.style.left);
    const lastRight = parseFloat(last.style.left) + last.offsetWidth;
    
    const totalWidth = sorted.reduce((sum, f) => sum + f.offsetWidth, 0);
    const gap = (lastRight - firstLeft - totalWidth) / (sorted.length - 1);
    
    let currentX = firstLeft;
    sorted.forEach((frame, i) => {
        if (i > 0 && i < sorted.length - 1) {
            frame.style.left = currentX + 'px';
        }
        currentX += frame.offsetWidth + gap;
    });
}

function distributeY() {
    if (selectedFrames.length < 3) {
        alert('균등 분배는 3개 이상의 액자가 필요합니다.');
        return;
    }
    
    const sorted = [...selectedFrames].sort((a, b) => 
        parseFloat(a.style.top) - parseFloat(b.style.top)
    );
    
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const firstTop = parseFloat(first.style.top);
    const lastBottom = parseFloat(last.style.top) + last.offsetHeight;
    
    const totalHeight = sorted.reduce((sum, f) => sum + f.offsetHeight, 0);
    const gap = (lastBottom - firstTop - totalHeight) / (sorted.length - 1);
    
    let currentY = firstTop;
    sorted.forEach((frame, i) => {
        if (i > 0 && i < sorted.length - 1) {
            frame.style.top = currentY + 'px';
        }
        currentY += frame.offsetHeight + gap;
    });
}

// ==================== 사람 모형 관리 ====================
function addPerson() {
    const heightInput = document.getElementById("personHeight");
    const height = parseInt(heightInput.value);
    
    if (!height || height < 50 || height > 250) {
        alert('사람 키는 50cm ~ 250cm 사이로 입력해주세요.');
        return;
    }

    const person = document.createElement("div");
    person.className = "person";
    
    const personWidth = height * 0.2;
    person.style.width = personWidth + "px";
    person.style.height = height + "px";
    
    person.title = `사람 모형 / ${height}cm`;
    
    const id = Date.now();
    person.dataset.id = id;
    person.dataset.height = height;

    person.style.left = "50px";
    
    const wall = document.getElementById('wall');
    const wallHeight = parseFloat(document.getElementById('wallHeight').value);
    
    person.style.top = (wallHeight - height) + "px";

    person.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" style="width: 100%; height: 100%;">
            <circle cx="12" cy="4" r="3"/>
            <path d="M12 8c-3 0-5 2-5 5v8h2v-8c0-1.5 1-3 3-3s3 1.5 3 3v8h2v-8c0-3-2-5-5-5z"/>
        </svg>
        <span>${height}cm</span>
    `;
    
    const deleteBtn = document.createElement("div");
    deleteBtn.className = "person-delete";
    deleteBtn.textContent = "×";
    deleteBtn.onclick = (e) => deletePerson(e, person);
    person.appendChild(deleteBtn);

    addPersonEvents(person);

    wall.appendChild(person);
    persons.push(person);
}

function addPersonEvents(person) {
    person.addEventListener("click", (e) => {
        if (e.target.classList.contains("person-delete")) return;
        if (selectedPerson) selectedPerson.classList.remove("selected");
        selectedPerson = person;
        person.classList.add("selected");
    });

    person.addEventListener("mousedown", (e) => {
        if (e.target.classList.contains("person-delete")) return;
        dragPerson = person;

        const wall = document.getElementById('wall');
        const wallRect = wall.getBoundingClientRect();
        
        const currentLeft = parseFloat(person.style.left) || 0;
        const currentTop = parseFloat(person.style.top) || 0;
        
        const mouseXInWall = (e.clientX - wallRect.left) / wallEditorZoom - wallEditorPanX / wallEditorZoom;
        const mouseYInWall = (e.clientY - wallRect.top) / wallEditorZoom - wallEditorPanY / wallEditorZoom;
        
        offsetX = mouseXInWall - currentLeft;
        offsetY = mouseYInWall - currentTop;

        e.preventDefault();
    });
}

function deletePerson(e, person) {
    e.stopPropagation();
    person.remove();
    persons = persons.filter(p => p !== person);
    if (selectedPerson === person) {
        selectedPerson = null;
    }
}

function clearAllPersons() {
    persons.forEach(person => person.remove());
    persons = [];
    selectedPerson = null;
}

function updateFrameLayerList() {
    const list = document.getElementById('frameLayerList');
    if (!list) return;

    list.innerHTML = '';

    frames.forEach((frame) => {
        const id = frame.dataset.id;
        const width = frame.dataset.width || parseInt(frame.style.width);
        const height = frame.dataset.height || parseInt(frame.style.height);

        const item = document.createElement("div");
        item.className = "layer-item";
        item.dataset.id = id;

        item.innerHTML = `
            <span class="layer-name">액자 ${id}</span>
            <span class="layer-size">${width}×${height}</span>
        `;

        item.onclick = () => {
            frame.scrollIntoView({ behavior: "smooth", block: "center" });
            frame.classList.add("selected");
            setTimeout(() => frame.classList.remove("selected"), 800);
        };

        list.appendChild(item);
    });

    list.style.overflowY = "auto";
}

// ==================== 이미지 크롭 기능 ====================
function openImageCropPopup() {
    document.getElementById('imageCropPopup').classList.add('active');
    const input = document.getElementById('popupImageInput');
    input.value = '';

    const cropImage = document.getElementById('cropImage');
    cropImage.style.display = 'none';

    input.onchange = function() {
        const file = input.files[0];
        if (!file || !file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }
        
        if (file.size > 20 * 1024 * 1024) {
            alert('이미지 파일은 20MB 이하로 업로드해주세요.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            cropImage.src = e.target.result;
            cropImage.style.display = 'block';

            if (cropper) cropper.destroy();

            const frameWidth = parseFloat(selectedFrameForCrop.dataset.width || selectedFrameForCrop.style.width);
            const frameHeight = parseFloat(selectedFrameForCrop.dataset.height || selectedFrameForCrop.style.height);
            const aspectRatio = frameWidth / frameHeight;

            cropper = new Cropper(cropImage, {
                aspectRatio: aspectRatio,
                viewMode: 1,
                autoCropArea: 1.0,
                dragMode: 'move',
                background: true,
                center: true,
                guides: true,
                highlight: true,
                cropBoxMovable: true,
                cropBoxResizable: true,
                zoomable: true,
                zoomOnWheel: true,
                rotatable: false,
                checkOrientation: true,
                responsive: true
            });
        };
        reader.readAsDataURL(file);
    };
}

function applyCroppedImage() {
    if (!cropper || !selectedFrameForCrop) return;

    const frameWidth = parseFloat(selectedFrameForCrop.dataset.width || selectedFrameForCrop.style.width);
    const frameHeight = parseFloat(selectedFrameForCrop.dataset.height || selectedFrameForCrop.style.height);
    
    const targetWidth = Math.min(frameWidth * 2, 1200);
    const targetHeight = Math.min(frameHeight * 2, 1200);

    const croppedCanvas = cropper.getCroppedCanvas({
        width: targetWidth,
        height: targetHeight,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });

    const croppedUrl = croppedCanvas.toDataURL('image/jpeg', 0.85);
    
    if (croppedUrl.length > 5 * 1024 * 1024) {
        const reducedUrl = croppedCanvas.toDataURL('image/jpeg', 0.7);
        selectedFrameForCrop.style.backgroundImage = `url(${reducedUrl})`;
        selectedFrameForCrop.dataset.image = reducedUrl;
        console.log('이미지 크기가 커서 품질을 낮췄습니다.');
    } else {
        selectedFrameForCrop.style.backgroundImage = `url(${croppedUrl})`;
        selectedFrameForCrop.dataset.image = croppedUrl;
    }
    
    selectedFrameForCrop.style.backgroundSize = 'cover';
    selectedFrameForCrop.style.backgroundPosition = 'center';

    closeImageCropPopup();
}

function closeImageCropPopup() {
    document.getElementById('imageCropPopup').classList.remove('active');
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    selectedFrameForCrop = null;
    document.getElementById('cropImage').src = '';
    document.getElementById('cropImage').style.display = 'none';
}

// ==================== 마우스업 이벤트에 가이드라인 제거 추가 ====================
document.addEventListener('mouseup', () => {
    removeGuideLines();
});