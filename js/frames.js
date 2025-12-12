// ==================== 액자 관리 ====================
function addFrame() {
    const nameInput = document.getElementById("frameName");
    const width = parseInt(document.getElementById("frameWidth").value);
    const height = parseInt(document.getElementById("frameHeight").value);

    const frameName = nameInput.value.trim() || `액자 ${frames.length + 1}`;
    nameInput.value = "";

    const frame = document.createElement("div");
    frame.className = "frame";
    frame.style.width = width + "px";  // scale 제거 - 직접 px 사용
    frame.style.height = height + "px"; // scale 제거 - 직접 px 사용
    frame.title = `${frameName} / ${width} × ${height} cm`;

    const id = Date.now();
    frame.dataset.id = id;
    frame.dataset.width = width;  // 원본 cm 값 저장
    frame.dataset.height = height; // 원본 cm 값 저장

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
    frame.style.width = frameData.width + 'px';  // 직접 px 사용
    frame.style.height = frameData.height + 'px'; // 직접 px 사용
    frame.style.left = frameData.left + 'px';
    frame.style.top = frameData.top + 'px';
    frame.dataset.width = frameData.width;
    frame.dataset.height = frameData.height;
    
    if (frameData.image) {
        frame.style.backgroundImage = `url(${frameData.image})`;
        frame.style.backgroundSize = 'cover';
        frame.dataset.image = frameData.image;
    }
    frame.innerHTML = `
        <span>${frameData.width} × ${frameData.height} cm</span>
        <div class="frame-delete" onclick="deleteFrame(event, this.parentElement)">×</div>
    `;
    
    frame.addEventListener('mousedown', startDrag);
    frame.addEventListener('click', selectFrame);
    
    wall.appendChild(frame);
    frames.push(frame);
    updateInfo();
    updateFrameLayerList();
}

function addFrameEvents(frame) {
    frame.addEventListener("click", (e) => {
        if (e.target.classList.contains("frame-delete")) return;
        if (selectedFrame) selectedFrame.classList.remove("selected");
        selectedFrame = frame;
        frame.classList.add("selected");
    });

    frame.addEventListener("mousedown", (e) => {
        if (e.target.classList.contains("frame-delete")) return;
        dragFrame = frame;

        // 줌/팬이 적용된 벽 기준으로 정확한 offset 계산
        const wall = document.getElementById('wall');
        const wallRect = wall.getBoundingClientRect();
        
        // 현재 요소의 실제 위치
        const currentLeft = parseFloat(frame.style.left) || 0;
        const currentTop = parseFloat(frame.style.top) || 0;
        
        // 마우스 클릭 위치를 벽 좌표계로 변환
        const mouseXInWall = (e.clientX - wallRect.left) / wallEditorZoom - wallEditorPanX / wallEditorZoom;
        const mouseYInWall = (e.clientY - wallRect.top) / wallEditorZoom - wallEditorPanY / wallEditorZoom;
        
        offsetX = mouseXInWall - currentLeft;
        offsetY = mouseYInWall - currentTop;

        e.preventDefault();
    });

    const del = document.createElement("div");
    del.className = "frame-delete";
    del.textContent = "×";
    del.onclick = (e) => deleteFrame(e, frame);

    frame.appendChild(del);
}

function startDrag(e) {
    if (e.target.classList.contains('frame-delete')) return;
    
    dragFrame = e.currentTarget;
    
    // 줌/팬이 적용된 벽 기준으로 정확한 offset 계산
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
    if (e.target.classList.contains('frame-delete')) return;
    
    if (selectedFrame) {
        selectedFrame.classList.remove('selected');
    }
    
    selectedFrame = e.currentTarget;
    selectedFrame.classList.add('selected');
}

function deleteFrame(e, frame) {
    e.stopPropagation();
    frame.remove();
    frames = frames.filter(f => f !== frame);
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
    updateInfo();
    updateFrameLayerList();
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
    
    // 사람 높이는 입력값, 너비는 비율적으로 설정 (약 1:5 비율)
    const personWidth = height * 0.2;
    person.style.width = personWidth + "px";  // 직접 px 사용
    person.style.height = height + "px";  // 직접 px 사용
    
    person.title = `사람 모형 / ${height}cm`;
    
    const id = Date.now();
    person.dataset.id = id;
    person.dataset.height = height;

    person.style.left = "50px";
    
    // 벽 높이 가져오기
    const wall = document.getElementById('wall');
    const wallHeight = parseFloat(document.getElementById('wallHeight').value);
    
    // 사람을 벽 하단에 배치
    person.style.top = (wallHeight - height) + "px";  // 직접 px 사용

    // 사람 아이콘 SVG
    person.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" style="width: 100%; height: 100%;">
            <circle cx="12" cy="4" r="3"/>
            <path d="M12 8c-3 0-5 2-5 5v8h2v-8c0-1.5 1-3 3-3s3 1.5 3 3v8h2v-8c0-3-2-5-5-5z"/>
        </svg>
        <span>${height}cm</span>
    `;
    
    // 삭제 버튼 생성
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
        
        // 파일 크기 체크 (20MB 제한)
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
                autoCropArea: 1.0, // 전체 영역 사용
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
                checkOrientation: true, // EXIF 회전 정보 체크
                responsive: true
            });
        };
        reader.readAsDataURL(file);
    };
}

function applyCroppedImage() {
    if (!cropper || !selectedFrameForCrop) return;

    // 실제 액자 크기 (px)
    const frameWidth = parseFloat(selectedFrameForCrop.dataset.width || selectedFrameForCrop.style.width);
    const frameHeight = parseFloat(selectedFrameForCrop.dataset.height || selectedFrameForCrop.style.height);
    
    // 적당한 해상도로 크롭 (액자 크기의 2배, 최대 1200px)
    const targetWidth = Math.min(frameWidth * 2, 1200);
    const targetHeight = Math.min(frameHeight * 2, 1200);

    const croppedCanvas = cropper.getCroppedCanvas({
        width: targetWidth,
        height: targetHeight,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });

    // JPEG 품질을 0.85로 조정 (품질과 용량의 균형)
    const croppedUrl = croppedCanvas.toDataURL('image/jpeg', 0.85);
    
    // 이미지 크기 체크 (5MB 이상이면 품질 낮춤)
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