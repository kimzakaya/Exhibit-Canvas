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
    
    // 안내 메시지 추가
    const hint = document.createElement('div');
    hint.className = 'info-item';
    hint.style.marginBottom = '10px';
    hint.style.fontSize = '13px';
    hint.style.color = '#3498db';
    hint.innerHTML = '💡 벽을 클릭하여 평면도에 추가하세요';
    wallList.appendChild(hint);
    
    Object.values(walls).forEach(wall => {
        const item = document.createElement('div');
        item.className = 'wall-list-item';
        item.innerHTML = `
            <strong>📋 ${wall.name}</strong>
            <small>${wall.width}×${wall.height}cm, 액자 ${wall.frames.length}개</small>
        `;
        item.onclick = () => addWallToFloorPlan(wall);
        item.style.cursor = 'pointer';
        
        // 호버 효과 강조
        item.onmouseenter = function() {
            this.style.transform = 'translateX(5px)';
            this.style.transition = 'all 0.2s';
        };
        item.onmouseleave = function() {
            this.style.transform = 'translateX(0)';
        };
        
        wallList.appendChild(item);
    });
}

function addWallToFloorPlan(wallData) {
    const canvas = document.getElementById('floorPlanCanvas');
    const thickness = 20;
    
    const floorWall = document.createElement('div');
    floorWall.className = 'floor-wall';
    const wallWidth = wallData.width * 0.5;
    floorWall.style.width = wallWidth + 'px';
    floorWall.style.height = thickness + 'px';
    floorWall.style.left = '50px';
    floorWall.style.top = '50px';
    floorWall.innerHTML = `
        <span>${wallData.name}</span>
        <div class="rotation-handle"></div>
    `;
    
    floorWall.dataset.wallId = wallData.id;
    floorWall.dataset.rotation = 0;
    floorWall.dataset.wallWidth = wallWidth;
    floorWall.dataset.wallHeight = thickness;
    
    floorWall.addEventListener('mousedown', startDragFloorWall);
    floorWall.addEventListener('click', selectFloorWall);
    
    const rotationHandle = floorWall.querySelector('.rotation-handle');
    rotationHandle.addEventListener('mousedown', startRotation);
    
    canvas.appendChild(floorWall);
    floorWalls.push(floorWall);
}

// 회전된 요소의 실제 바운딩 박스 크기 계산
function getRotatedBounds(width, height, rotation) {
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    
    const rotatedWidth = width * cos + height * sin;
    const rotatedHeight = width * sin + height * cos;
    
    return { width: rotatedWidth, height: rotatedHeight };
}

function startDragFloorWall(e) {
    // 우클릭이나 회전 핸들은 무시
    if (e.button === 2 || e.target.classList.contains('rotation-handle')) return;
    
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
    if (e.target.classList.contains('rotation-handle')) return;
    
    if (selectedFloorWall) {
        selectedFloorWall.classList.remove('selected');
    }
    
    selectedFloorWall = e.currentTarget;
    selectedFloorWall.classList.add('selected');
}

function deleteFloorWall(e, wall) {
    if (e) e.stopPropagation();
    
    const wallToDelete = wall || selectedFloorWall;
    if (!wallToDelete) return;
    
    wallToDelete.remove();
    floorWalls = floorWalls.filter(w => w !== wallToDelete);
    if (selectedFloorWall === wallToDelete) {
        selectedFloorWall = null;
    }
}

function startRotation(e) {
    e.stopPropagation();
    e.preventDefault();
    
    // 더블클릭 감지
    const rotationHandle = e.target;
    const clickCount = parseInt(rotationHandle.dataset.clickCount || 0) + 1;
    rotationHandle.dataset.clickCount = clickCount;
    
    setTimeout(() => {
        rotationHandle.dataset.clickCount = 0;
    }, 300);
    
    // 더블클릭이면 각도 입력
    if (clickCount === 2) {
        showRotationInput(e.target.parentElement);
        return;
    }
    
    // 기존 드래그 회전 기능
    isRotating = true;
    selectedFloorWall = e.target.parentElement;
    selectedFloorWall.classList.add('selected');
    
    initialRotation = parseFloat(selectedFloorWall.dataset.rotation || 0);
    
    const rect = selectedFloorWall.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    rotationStartAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
}

function showRotationInput(wall) {
    const currentRotation = parseFloat(wall.dataset.rotation || 0);
    const angle = prompt(`회전 각도를 입력하세요 (현재: ${Math.round(currentRotation)}°)\n\n예: 45, 90, -30 등`, Math.round(currentRotation));
    
    if (angle === null) return; // 취소
    
    const newAngle = parseFloat(angle);
    if (isNaN(newAngle)) {
        alert('올바른 숫자를 입력해주세요.');
        return;
    }
    
    wall.style.transform = `rotate(${newAngle}deg)`;
    wall.dataset.rotation = newAngle;
}

// ==================== 컨텍스트 메뉴 ====================
function editWall() {
    if (!contextMenuTarget) return;
    const wallId = contextMenuTarget.dataset.wallId;
    switchTab('wall-editor');
    document.getElementById('wallSelect').value = wallId;
    switchWall();
    
    // 컨텍스트 메뉴 닫기
    document.getElementById('contextMenu').classList.remove('active');
}

function viewWallStructure() {
    if (!contextMenuTarget) return;
    const wallId = contextMenuTarget.dataset.wallId;
    const wallData = walls[wallId];
    if (!wallData) return;

    const popupWall = document.getElementById('popupWall');
    popupWall.innerHTML = '';
    popupWall.style.width = wallData.width + 'px';
    popupWall.style.height = wallData.height + 'px';

    wallData.frames.forEach(frameData => {
        const frame = document.createElement('div');
        frame.className = 'frame';
        frame.style.width = frameData.width + 'px';
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
    
    // 컨텍스트 메뉴 닫기
    document.getElementById('contextMenu').classList.remove('active');
}

function rotateWallByInput() {
    if (!contextMenuTarget) return;
    
    const currentRotation = parseFloat(contextMenuTarget.dataset.rotation || 0);
    const angle = prompt(`회전 각도를 입력하세요 (현재: ${Math.round(currentRotation)}°)\n\n예: 45, 90, -30 등`, Math.round(currentRotation));
    
    if (angle === null) return; // 취소
    
    const newAngle = parseFloat(angle);
    if (isNaN(newAngle)) {
        alert('올바른 숫자를 입력해주세요.');
        return;
    }
    
    contextMenuTarget.style.transform = `rotate(${newAngle}deg)`;
    contextMenuTarget.dataset.rotation = newAngle;
    
    // 컨텍스트 메뉴 닫기
    document.getElementById('contextMenu').classList.remove('active');
}

function resetWallRotation() {
    if (!contextMenuTarget) return;
    
    contextMenuTarget.style.transform = 'rotate(0deg)';
    contextMenuTarget.dataset.rotation = 0;
    
    // 컨텍스트 메뉴 닫기
    document.getElementById('contextMenu').classList.remove('active');
}

function deleteWallFromContext() {
    if (!contextMenuTarget) return;
    deleteFloorWall(null, contextMenuTarget);
    
    // 컨텍스트 메뉴 닫기
    document.getElementById('contextMenu').classList.remove('active');
}

function closeWallStructurePopup() {
    document.getElementById('wallStructurePopup').classList.remove('active');
}

// ==================== 키보드 이벤트 ====================
document.addEventListener('keydown', (e) => {
    // DELETE 키로 삭제
    if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeTab = document.querySelector('.tab-content.active');
        
        if (activeTab && activeTab.id === 'wall-editor') {
            // 벽 에디터에서는 선택된 액자 삭제
            if (selectedFrames.length > 0) {
                e.preventDefault();
                deleteSelectedFrames();
            }
        } else if (activeTab && activeTab.id === 'floor-plan') {
            // 평면도에서는 선택된 벽 삭제
            if (selectedFloorWall) {
                e.preventDefault();
                deleteFloorWall(null, selectedFloorWall);
            }
        }
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
    
    // 액자 드래그 (벽 에디터) - 줌/팬 보정 + 가이드라인
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
        
        // 가이드라인 표시 및 스냅
        const snapped = showGuideLines(dragFrame, newX, newY);
        if (snapped) {
            newX = snapped.x;
            newY = snapped.y;
        }
        
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
    
    // 평면도 벽 드래그 - 회전 고려한 경계 체크
    if (dragFloorWall && !isRotating && !isPanning) {
        const canvas = document.getElementById('floorPlanCanvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        // 마우스 위치를 캔버스 좌표계로 변환
        const mouseXInCanvas = (e.clientX - canvasRect.left) / floorPlanZoom - floorPlanPanX / floorPlanZoom;
        const mouseYInCanvas = (e.clientY - canvasRect.top) / floorPlanZoom - floorPlanPanY / floorPlanZoom;
        
        let newX = mouseXInCanvas - offsetX;
        let newY = mouseYInCanvas - offsetY;
        
        // 캔버스 크기
        const canvasWidth = canvasRect.width / floorPlanZoom;
        const canvasHeight = canvasRect.height / floorPlanZoom;
        
        // 원본 크기
        const wallWidth = parseFloat(dragFloorWall.dataset.wallWidth) || dragFloorWall.offsetWidth;
        const wallHeight = parseFloat(dragFloorWall.dataset.wallHeight) || dragFloorWall.offsetHeight;
        
        // 현재 회전 각도
        const rotation = parseFloat(dragFloorWall.dataset.rotation || 0);
        
        // 회전된 바운딩 박스 크기 계산
        const rotatedBounds = getRotatedBounds(wallWidth, wallHeight, rotation);
        
        // 회전 중심을 고려한 경계 체크
        // 회전 중심은 요소의 중앙이므로, 좌상단 좌표를 기준으로 조정
        const halfOriginalWidth = wallWidth / 2;
        const halfOriginalHeight = wallHeight / 2;
        const halfRotatedWidth = rotatedBounds.width / 2;
        const halfRotatedHeight = rotatedBounds.height / 2;
        
        // 실제 위치 제한 (회전된 바운딩 박스가 캔버스를 벗어나지 않도록)
        newX = Math.max(
            halfRotatedWidth - halfOriginalWidth,
            Math.min(newX, canvasWidth - halfRotatedWidth - halfOriginalWidth)
        );
        newY = Math.max(
            halfRotatedHeight - halfOriginalHeight,
            Math.min(newY, canvasHeight - halfRotatedHeight - halfOriginalHeight)
        );
        
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
        
        const rotation = initialRotation + (angleDelta * 0.15);
        
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

    document.getElementById('wallWidth').value = 300;
    document.getElementById('wallHeight').value = 300;
    wallEditorZoom = 1;
    wallEditorPanX = 0;
    wallEditorPanY = 0;
    updateWall();
    updateWallEditorTransform();

    // 평면도 컨텍스트 메뉴
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

    // 모든 컨텍스트 메뉴 닫기
    document.addEventListener('click', () => {
        document.getElementById('contextMenu').classList.remove('active');
        document.getElementById('frameContextMenu').classList.remove('active');
    });

    // 벽 에디터의 액자 우클릭 이벤트
    const wall = document.getElementById('wall');
    wall.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (e.target.classList.contains('frame')) {
            // 다른 메뉴 닫기
            document.getElementById('contextMenu').classList.remove('active');
            
            // 액자 컨텍스트 메뉴 표시
            contextMenuTarget = e.target;
            const menu = document.getElementById('frameContextMenu');
            menu.style.left = `${e.pageX}px`;
            menu.style.top = `${e.pageY}px`;
            menu.classList.add('active');
        }
    });
    
    // 이미지 크롭 팝업 외부 클릭 시 닫기
    document.getElementById('imageCropPopup').addEventListener('click', (e) => {
        if (e.target.id === 'imageCropPopup') {
            closeImageCropPopup();
        }
    });
    
    // 벽 구조 팝업 외부 클릭 시 닫기
    document.getElementById('wallStructurePopup').addEventListener('click', (e) => {
        if (e.target.id === 'wallStructurePopup') {
            closeWallStructurePopup();
        }
    });
});