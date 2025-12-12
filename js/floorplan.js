// ==================== 평면도 관리 ====================
function updateFloorPlan() {
    const width = document.getElementById('spaceWidth').value;
    const height = document.getElementById('spaceHeight').value;
    const canvas = document.getElementById('floorPlanCanvas');
    
    canvas.style.width = (width * 0.5) + 'px';  // 평면도는 0.5 스케일 (더 작게)
    canvas.style.height = (height * 0.5) + 'px';
}

function updateWallList() {
    const wallList = document.getElementById('wallList');
    wallList.innerHTML = '';
    
    if (Object.keys(walls).length === 0) {
        wallList.innerHTML = '<div class="info-item">저장된 벽이 없습니다.<br>벽 관리 탭에서 벽을 만들어주세요.</div>';
        return;
    }
    
    Object.values(walls).forEach(wall => {
        const item = document.createElement('div');
        item.className = 'wall-list-item';
        item.innerHTML = `
            <strong>${wall.name}</strong>
            <small>${wall.width}×${wall.height}cm, 액자 ${wall.frames.length}개</small>
        `;
        item.onclick = () => addWallToFloorPlan(wall);
        wallList.appendChild(item);
    });
}

function addWallToFloorPlan(wallData) {
    const canvas = document.getElementById('floorPlanCanvas');
    const thickness = 20;
    
    const floorWall = document.createElement('div');
    floorWall.className = 'floor-wall';
    floorWall.style.width = (wallData.width * 0.5) + 'px';  // 평면도는 0.5 스케일
    floorWall.style.height = thickness + 'px';
    floorWall.style.left = '50px';
    floorWall.style.top = '50px';
    floorWall.innerHTML = `
        <span>${wallData.name}</span>
        <div class="floor-wall-delete" onclick="deleteFloorWall(event, this.parentElement)">×</div>
        <div class="rotation-handle"></div>
    `;
    
    floorWall.dataset.wallId = wallData.id;
    floorWall.dataset.rotation = 0;
    
    floorWall.addEventListener('mousedown', startDragFloorWall);
    floorWall.addEventListener('click', selectFloorWall);
    
    const rotationHandle = floorWall.querySelector('.rotation-handle');
    rotationHandle.addEventListener('mousedown', startRotation);
    
    canvas.appendChild(floorWall);
    floorWalls.push(floorWall);
}

function startDragFloorWall(e) {
    if (e.target.classList.contains('floor-wall-delete') || 
        e.target.classList.contains('rotation-handle')) return;
    
    dragFloorWall = e.currentTarget;
    
    // 줌/팬이 적용된 캔버스 기준으로 정확한 offset 계산
    const canvas = document.getElementById('floorPlanCanvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    // 현재 요소의 실제 위치 (transform 적용 전)
    const currentLeft = parseFloat(dragFloorWall.style.left) || 0;
    const currentTop = parseFloat(dragFloorWall.style.top) || 0;
    
    // 마우스 클릭 위치를 캔버스 좌표계로 변환
    const mouseXInCanvas = (e.clientX - canvasRect.left) / floorPlanZoom - floorPlanPanX / floorPlanZoom;
    const mouseYInCanvas = (e.clientY - canvasRect.top) / floorPlanZoom - floorPlanPanY / floorPlanZoom;
    
    offsetX = mouseXInCanvas - currentLeft;
    offsetY = mouseYInCanvas - currentTop;
    
    e.preventDefault();
    e.stopPropagation();
}

function selectFloorWall(e) {
    if (e.target.classList.contains('floor-wall-delete') || 
        e.target.classList.contains('rotation-handle')) return;
    
    if (selectedFloorWall) {
        selectedFloorWall.classList.remove('selected');
    }
    
    selectedFloorWall = e.currentTarget;
    selectedFloorWall.classList.add('selected');
}

function deleteFloorWall(e, wall) {
    e.stopPropagation();
    wall.remove();
    floorWalls = floorWalls.filter(w => w !== wall);
    if (selectedFloorWall === wall) {
        selectedFloorWall = null;
    }
}

function startRotation(e) {
    e.stopPropagation();
    e.preventDefault();
    
    isRotating = true;
    selectedFloorWall = e.target.parentElement;
    selectedFloorWall.classList.add('selected');
    
    initialRotation = parseFloat(selectedFloorWall.dataset.rotation || 0);
    
    const rect = selectedFloorWall.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    rotationStartAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
}

// ==================== 컨텍스트 메뉴 ====================
function editWall() {
    if (!contextMenuTarget) return;
    const wallId = contextMenuTarget.dataset.wallId;
    switchTab('wall-editor');
    document.getElementById('wallSelect').value = wallId;
    switchWall();
}

function viewWallStructure() {
    if (!contextMenuTarget) return;
    const wallId = contextMenuTarget.dataset.wallId;
    const wallData = walls[wallId];
    if (!wallData) return;

    const popupWall = document.getElementById('popupWall');
    popupWall.innerHTML = '';
    popupWall.style.width = wallData.width + 'px';  // 직접 px 사용
    popupWall.style.height = wallData.height + 'px';

    wallData.frames.forEach(frameData => {
        const frame = document.createElement('div');
        frame.className = 'frame';
        frame.style.width = frameData.width + 'px';  // 직접 px 사용
        frame.style.height = frameData.height + 'px';
        frame.style.left = frameData.left + 'px';
        frame.style.top = frameData.top + 'px';
        if (frameData.image) {
            frame.style.backgroundImage = `url(${frameData.image})`;
            frame.style.backgroundSize = 'cover';
        }
        frame.innerHTML = `<span>${frameData.width} × ${frameData.height} cm</span>`;
        popupWall.appendChild(frame);
    });

    document.getElementById('popupWallName').textContent = `${wallData.name} 구조 (액자 ${wallData.frames.length}개)`;
    document.getElementById('wallStructurePopup').classList.add('active');
}

function deleteWallFromContext() {
    if (!contextMenuTarget) return;
    deleteFloorWall(null, contextMenuTarget);
}

function closeWallStructurePopup() {
    document.getElementById('wallStructurePopup').classList.remove('active');
}

// ==================== 키보드 이벤트 ====================
document.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFloorWall) {
        e.preventDefault();
        deleteFloorWall(e, selectedFloorWall);
    }
    
    if (e.code === 'Space' && !e.repeat && !spacePressed) {
        e.preventDefault();
        spacePressed = true;
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab) {
            activeTab.style.cursor = 'grab';
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        spacePressed = false;
        isPanning = false;
        panningWorkspace = null;
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab) {
            activeTab.style.cursor = 'default';
        }
    }
});

// ==================== 마우스 이벤트 ====================
document.addEventListener('mousedown', (e) => {
    if (spacePressed && e.button === 0) {
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return;
        
        if (activeTab.id === 'wall-editor') {
            isPanning = true;
            panningWorkspace = 'wall-editor';
            panStartX = e.clientX - wallEditorPanX;
            panStartY = e.clientY - wallEditorPanY;
            activeTab.style.cursor = 'grabbing';
            e.preventDefault();
        }
        else if (activeTab.id === 'floor-plan') {
            isPanning = true;
            panningWorkspace = 'floor-plan';
            panStartX = e.clientX - floorPlanPanX;
            panStartY = e.clientY - floorPlanPanY;
            activeTab.style.cursor = 'grabbing';
            e.preventDefault();
        }
    }
});

document.addEventListener('mousemove', (e) => {
    if (isPanning && spacePressed) {
        if (panningWorkspace === 'wall-editor') {
            wallEditorPanX = e.clientX - panStartX;
            wallEditorPanY = e.clientY - panStartY;
            updateWallEditorTransform();
        } else if (panningWorkspace === 'floor-plan') {
            floorPlanPanX = e.clientX - panStartX;
            floorPlanPanY = e.clientY - panStartY;
            updateFloorPlanTransform();
        }
        return;
    }
    
    // 액자 드래그 (벽 에디터) - 줌/팬 보정
    if (dragFrame && !isPanning) {
        const wall = document.getElementById('wall');
        const wallRect = wall.getBoundingClientRect();
        
        // 마우스 위치를 캔버스 좌표계로 변환
        const mouseXInWall = (e.clientX - wallRect.left) / wallEditorZoom - wallEditorPanX / wallEditorZoom;
        const mouseYInWall = (e.clientY - wallRect.top) / wallEditorZoom - wallEditorPanY / wallEditorZoom;
        
        let newX = mouseXInWall - offsetX;
        let newY = mouseYInWall - offsetY;
        
        // 경계 체크 (변환된 좌표 기준)
        const wallWidth = wallRect.width / wallEditorZoom;
        const wallHeight = wallRect.height / wallEditorZoom;
        
        newX = Math.max(0, Math.min(newX, wallWidth - dragFrame.offsetWidth));
        newY = Math.max(0, Math.min(newY, wallHeight - dragFrame.offsetHeight));
        
        dragFrame.style.left = newX + 'px';
        dragFrame.style.top = newY + 'px';
    }
    
    // 사람 모형 드래그 (벽 에디터)
    if (dragPerson && !isPanning) {
        const wall = document.getElementById('wall');
        const wallRect = wall.getBoundingClientRect();
        
        const mouseXInWall = (e.clientX - wallRect.left) / wallEditorZoom - wallEditorPanX / wallEditorZoom;
        const mouseYInWall = (e.clientY - wallRect.top) / wallEditorZoom - wallEditorPanY / wallEditorZoom;
        
        let newX = mouseXInWall - offsetX;
        let newY = mouseYInWall - offsetY;
        
        const wallWidth = wallRect.width / wallEditorZoom;
        const wallHeight = wallRect.height / wallEditorZoom;
        
        newX = Math.max(0, Math.min(newX, wallWidth - dragPerson.offsetWidth));
        newY = Math.max(0, Math.min(newY, wallHeight - dragPerson.offsetHeight));
        
        dragPerson.style.left = newX + 'px';
        dragPerson.style.top = newY + 'px';
    }
    
    // 평면도 벽 드래그 - 줌/팬 보정
    if (dragFloorWall && !isRotating && !isPanning) {
        const canvas = document.getElementById('floorPlanCanvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        // 마우스 위치를 캔버스 좌표계로 변환
        const mouseXInCanvas = (e.clientX - canvasRect.left) / floorPlanZoom - floorPlanPanX / floorPlanZoom;
        const mouseYInCanvas = (e.clientY - canvasRect.top) / floorPlanZoom - floorPlanPanY / floorPlanZoom;
        
        let newX = mouseXInCanvas - offsetX;
        let newY = mouseYInCanvas - offsetY;
        
        // 경계 체크 (변환된 좌표 기준)
        const canvasWidth = canvasRect.width / floorPlanZoom;
        const canvasHeight = canvasRect.height / floorPlanZoom;
        
        newX = Math.max(0, Math.min(newX, canvasWidth - dragFloorWall.offsetWidth));
        newY = Math.max(0, Math.min(newY, canvasHeight - dragFloorWall.offsetHeight));
        
        dragFloorWall.style.left = newX + 'px';
        dragFloorWall.style.top = newY + 'px';
    }
    
    // 회전
    if (isRotating && selectedFloorWall) {
        const rect = selectedFloorWall.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
        const angleDelta = currentAngle - rotationStartAngle;
        
        const rotation = initialRotation + (angleDelta * 0.3);
        
        selectedFloorWall.style.transform = `rotate(${rotation}deg)`;
        selectedFloorWall.dataset.rotation = rotation;
    }
});

document.addEventListener('mouseup', () => {
    dragFrame = null;
    dragFloorWall = null;
    dragPerson = null;
    isRotating = false;
    
    if (isPanning) {
        isPanning = false;
        if (spacePressed) {
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab) {
                activeTab.style.cursor = 'grab';
            }
        }
    }
});

// ==================== 휠 줌 (alt + 휠) ====================
document.getElementById('wall').addEventListener('wheel', (e) => {
    if (e.altKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        zoomWallEditor(delta);
    }
}, { passive: false });

document.getElementById('floorPlanCanvas').addEventListener('wheel', (e) => {
    if (e.altKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        zoomFloorPlan(delta);
    }
}, { passive: false });

// ==================== 초기화 ====================
document.getElementById('wallWidth').addEventListener('input', updateWall);
document.getElementById('wallHeight').addEventListener('input', updateWall);

updateWall();
updateFloorPlan();

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.header').style.display = 'none';
    document.querySelector('.tabs').style.display = 'none';
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    document.getElementById('initial-screen').style.display = 'flex';

    document.getElementById('wallWidth').value = 4000;
    document.getElementById('wallHeight').value = 3000;
    wallEditorZoom = 1;
    wallEditorPanX = 0;
    wallEditorPanY = 0;
    updateWall();
    updateWallEditorTransform();

    const floorPlanCanvas = document.getElementById('floorPlanCanvas');
    floorPlanCanvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (e.target.classList.contains('floor-wall') || e.target.parentElement.classList.contains('floor-wall')) {
            contextMenuTarget = e.target.closest('.floor-wall');
            const menu = document.getElementById('contextMenu');
            menu.style.left = `${e.pageX}px`;
            menu.style.top = `${e.pageY}px`;
            menu.classList.add('active');
        }
    });

    document.addEventListener('click', () => {
        document.getElementById('contextMenu').classList.remove('active');
    });

    const wall = document.getElementById('wall');
    wall.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (e.target.classList.contains('frame')) {
            selectedFrameForCrop = e.target;
            openImageCropPopup();
        }
    });
});