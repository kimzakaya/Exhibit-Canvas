// 전역 변수
const scale = 0.5; // 1cm = 0.5px
let walls = {}; // 저장된 모든 벽들
let currentWallId = null; // 현재 편집 중인 벽
let frames = []; // 현재 벽의 액자들
let selectedFrame = null;
let dragFrame = null;
let offsetX = 0;
let offsetY = 0;

// 평면도 관련
let floorWalls = []; // 평면도에 배치된 벽들
let selectedFloorWall = null;
let dragFloorWall = null;
let isRotating = false;
let rotationStartAngle = 0;
let initialRotation = 0;

// 줌 관련
let wallEditorZoom = 1;
let floorPlanZoom = 1;
let wallEditorPanX = 0;
let wallEditorPanY = 0;
let floorPlanPanX = 0;
let floorPlanPanY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panningWorkspace = null;
let spacePressed = false;

// ==================== 탭 전환 ====================
function switchTab(tabId) {
    // 모든 탭 비활성화
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';  // inline으로 숨김
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 선택된 탭 활성화
    const selectedTab = document.getElementById(tabId);
    selectedTab.classList.add('active');
    selectedTab.style.display = 'block';  // inline으로 보이게
    
    // 해당하는 탭 버튼 활성화
    const buttons = document.querySelectorAll('.tab-button');
    if (tabId === 'wall-editor') {
        buttons[0].classList.add('active');
    } else if (tabId === 'floor-plan') {
        buttons[1].classList.add('active');
    }
    
    if (tabId === 'floor-plan') {
        updateFloorPlan();
        updateWallList();
    }
}

// ==================== 벽 관리 ====================
function createOrUpdateWall() {
    const wallName = document.getElementById('wallName').value.trim();
    if (!wallName) {
        alert('벽 이름을 입력해주세요.');
        return;
    }
    
    const wallWidth = document.getElementById('wallWidth').value;
    const wallHeight = document.getElementById('wallHeight').value;
    
    const wallId = currentWallId || 'wall_' + Date.now();
    
    walls[wallId] = {
        id: wallId,
        name: wallName,
        width: parseFloat(wallWidth),
        height: parseFloat(wallHeight),
        frames: frames.map(frame => ({
            width: parseFloat(frame.style.width) / scale,
            height: parseFloat(frame.style.height) / scale,
            left: parseFloat(frame.style.left),
            top: parseFloat(frame.style.top)
        }))
    };
    
    currentWallId = wallId;
    updateWallSelect();
    alert(`"${wallName}" 벽이 저장되었습니다!`);
}

function updateWallSelect() {
    const select = document.getElementById('wallSelect');
    select.innerHTML = '<option value="">새 벽 만들기</option>';
    
    Object.values(walls).forEach(wall => {
        const option = document.createElement('option');
        option.value = wall.id;
        option.textContent = `${wall.name} (${wall.width}×${wall.height}cm, 액자 ${wall.frames.length}개)`;
        select.appendChild(option);
    });
    
    if (currentWallId) {
        select.value = currentWallId;
    }
}

function switchWall() {
    const wallId = document.getElementById('wallSelect').value;
    
    if (!wallId) {
        // 새 벽 만들기
        currentWallId = null;
        document.getElementById('wallName').value = '';
        document.getElementById('wallWidth').value = 400;
        document.getElementById('wallHeight').value = 300;
        clearAllFrames();
        updateWall();
        return;
    }
    
    const wall = walls[wallId];
    if (!wall) return;
    
    currentWallId = wallId;
    document.getElementById('wallName').value = wall.name;
    document.getElementById('wallWidth').value = wall.width;
    document.getElementById('wallHeight').value = wall.height;
    
    // 액자 복원
    clearAllFrames();
    wall.frames.forEach(frameData => {
        addFrameWithData(frameData);
    });
    
    updateWall();
}

function deleteCurrentWall() {
    if (!currentWallId) {
        alert('삭제할 벽이 없습니다.');
        return;
    }
    
    const wall = walls[currentWallId];
    if (confirm(`"${wall.name}" 벽을 삭제하시겠습니까?`)) {
        delete walls[currentWallId];
        currentWallId = null;
        document.getElementById('wallName').value = '';
        clearAllFrames();
        updateWallSelect();
        updateWall();
    }
}

// ==================== 벽 크기 업데이트 ====================
function updateWall() {
    const width = document.getElementById('wallWidth').value;
    const height = document.getElementById('wallHeight').value;
    const wall = document.getElementById('wall');
    
    wall.style.width = (width * scale) + 'px';
    wall.style.height = (height * scale) + 'px';
    
    document.getElementById('wallSize').textContent = width + ' × ' + height + ' cm';
    updateInfo();
}

function toggleGrid() {
    const wall = document.getElementById('wall');
    const checked = document.getElementById('gridToggle').checked;
    
    if (checked) {
        wall.classList.add('grid');
    } else {
        wall.classList.remove('grid');
    }
}

// ==================== 액자 관리 ====================
function addFrame() {
    const width = document.getElementById('frameWidth').value;
    const height = document.getElementById('frameHeight').value;
    addFrameWithData({ width, height, left: 10, top: 10 });
}

function addFrameWithData(frameData) {
    const wall = document.getElementById('wall');
    
    const frame = document.createElement('div');
    frame.className = 'frame';
    frame.style.width = (frameData.width * scale) + 'px';
    frame.style.height = (frameData.height * scale) + 'px';
    frame.style.left = frameData.left + 'px';
    frame.style.top = frameData.top + 'px';
    frame.innerHTML = `
        <span>${frameData.width} × ${frameData.height} cm</span>
        <div class="frame-delete" onclick="deleteFrame(event, this.parentElement)">×</div>
    `;
    
    frame.addEventListener('mousedown', startDrag);
    frame.addEventListener('click', selectFrame);
    
    wall.appendChild(frame);
    frames.push(frame);
    updateInfo();
}

function startDrag(e) {
    if (e.target.classList.contains('frame-delete')) return;
    
    dragFrame = e.currentTarget;
    const rect = dragFrame.getBoundingClientRect();
    
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
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
}

function clearAllFrames() {
    frames.forEach(frame => frame.remove());
    frames = [];
    selectedFrame = null;
    updateInfo();
}

function updateInfo() {
    document.getElementById('frameCount').textContent = frames.length;
}

// ==================== 줌 기능 ====================
function zoomWallEditor(delta) {
    wallEditorZoom = Math.max(0.5, Math.min(3, wallEditorZoom + delta));
    updateWallEditorTransform();
    document.getElementById('wallEditorZoomValue').textContent = Math.round(wallEditorZoom * 100) + '%';
}

function zoomFloorPlan(delta) {
    floorPlanZoom = Math.max(0.5, Math.min(3, floorPlanZoom + delta));
    updateFloorPlanTransform();
    document.getElementById('floorPlanZoomValue').textContent = Math.round(floorPlanZoom * 100) + '%';
}

function updateWallEditorTransform() {
    const canvas = document.getElementById('wall');
    canvas.style.transform = `translate(${wallEditorPanX}px, ${wallEditorPanY}px) scale(${wallEditorZoom})`;
}

function updateFloorPlanTransform() {
    const canvas = document.getElementById('floorPlanCanvas');
    canvas.style.transform = `translate(${floorPlanPanX}px, ${floorPlanPanY}px) scale(${floorPlanZoom})`;
}

// ==================== 평면도 ====================
function updateFloorPlan() {
    const width = document.getElementById('spaceWidth').value;
    const height = document.getElementById('spaceHeight').value;
    const canvas = document.getElementById('floorPlanCanvas');
    
    canvas.style.width = (width * scale) + 'px';
    canvas.style.height = (height * scale) + 'px';
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
    const thickness = 20; // 벽 두께 (px)
    
    const floorWall = document.createElement('div');
    floorWall.className = 'floor-wall';
    floorWall.style.width = (wallData.width * scale) + 'px';
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
    const rect = dragFloorWall.getBoundingClientRect();
    
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
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
    
    // 현재 회전 각도 저장
    initialRotation = parseFloat(selectedFloorWall.dataset.rotation || 0);
    
    const rect = selectedFloorWall.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    rotationStartAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
}

// ==================== 저장/불러오기 ====================
function saveProject() {
    const project = {
        walls: walls,
        floorPlan: {
            spaceWidth: document.getElementById('spaceWidth').value,
            spaceHeight: document.getElementById('spaceHeight').value,
            walls: floorWalls.map(wall => ({
                wallId: wall.dataset.wallId,
                left: parseFloat(wall.style.left),
                top: parseFloat(wall.style.top),
                rotation: parseFloat(wall.dataset.rotation || 0)
            }))
        },
        savedDate: new Date().toISOString()
    };
    
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Exhibit Canvas - exhibition-project-${Date.now()}.json`;  // 수정: prefix 추가
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('프로젝트가 저장되었습니다! 다운로드 폴더 안에 "Exhibit Canvas" 폴더를 만들어 저장해주세요. (브라우저에서 자동 폴더 생성은 불가능합니다.)');
}

function loadProject(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const project = JSON.parse(e.target.result);
            
            // 벽 데이터 복원
            walls = project.walls;
            currentWallId = null;
            updateWallSelect();
            
            // 평면도 설정 복원
            document.getElementById('spaceWidth').value = project.floorPlan.spaceWidth;
            document.getElementById('spaceHeight').value = project.floorPlan.spaceHeight;
            updateFloorPlan();
            
            // 평면도 벽 복원
            floorWalls.forEach(wall => wall.remove());
            floorWalls = [];
            
            project.floorPlan.walls.forEach(wallData => {
                const wallInfo = walls[wallData.wallId];
                if (!wallInfo) return;
                
                const canvas = document.getElementById('floorPlanCanvas');
                const thickness = 20;
                
                const floorWall = document.createElement('div');
                floorWall.className = 'floor-wall';
                floorWall.style.width = (wallInfo.width * scale) + 'px';
                floorWall.style.height = thickness + 'px';
                floorWall.style.left = wallData.left + 'px';
                floorWall.style.top = wallData.top + 'px';
                floorWall.style.transform = `rotate(${wallData.rotation}deg)`;
                floorWall.innerHTML = `
                    <span>${wallInfo.name}</span>
                    <div class="floor-wall-delete" onclick="deleteFloorWall(event, this.parentElement)">×</div>
                    <div class="rotation-handle"></div>
                `;
                
                floorWall.dataset.wallId = wallData.wallId;
                floorWall.dataset.rotation = wallData.rotation;
                
                floorWall.addEventListener('mousedown', startDragFloorWall);
                floorWall.addEventListener('click', selectFloorWall);
                
                const rotationHandle = floorWall.querySelector('.rotation-handle');
                rotationHandle.addEventListener('mousedown', startRotation);
                
                canvas.appendChild(floorWall);
                floorWalls.push(floorWall);
            });
            
            // 프로젝트 불러온 후 초기 화면 숨기기
            document.getElementById('initial-screen').style.display = 'none';
            document.querySelector('.header').style.display = 'block';
            document.querySelector('.tabs').style.display = 'flex';
            switchTab('floor-plan');
            updateWallList();  // 추가: 명시적 업데이트

            alert('프로젝트를 불러왔습니다!');
        } catch (error) {
            alert('파일을 읽는 중 오류가 발생했습니다: ' + error.message);
        }
    };
    reader.readAsText(file);
    
    event.target.value = '';
}

// ==================== 키보드 이벤트 ====================
document.addEventListener('keydown', (e) => {
    // Delete 키 또는 Backspace 키
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFloorWall) {
        e.preventDefault();
        deleteFloorWall(e, selectedFloorWall);
    }
    
    // 스페이스바 누름
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
    // 스페이스바 뗌
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
    // 스페이스바 + 좌클릭으로 패닝 시작
    if (spacePressed && e.button === 0) {
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return;
        
        // 벽 관리 탭
        if (activeTab.id === 'wall-editor') {
            isPanning = true;
            panningWorkspace = 'wall-editor';
            panStartX = e.clientX - wallEditorPanX;
            panStartY = e.clientY - wallEditorPanY;
            activeTab.style.cursor = 'grabbing';
            e.preventDefault();
        }
        // 평면도 탭
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
    // 패닝 중
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
    
    // 액자 드래그
    if (dragFrame && !isPanning) {
        const wall = document.getElementById('wall');
        const wallRect = wall.getBoundingClientRect();
        
        let newX = e.clientX - wallRect.left - offsetX;
        let newY = e.clientY - wallRect.top - offsetY;
        
        newX = Math.max(0, Math.min(newX, wallRect.width - dragFrame.offsetWidth));
        newY = Math.max(0, Math.min(newY, wallRect.height - dragFrame.offsetHeight));
        
        dragFrame.style.left = newX + 'px';
        dragFrame.style.top = newY + 'px';
    }
    
    // 평면도 벽 드래그
    if (dragFloorWall && !isRotating && !isPanning) {
        const canvas = document.getElementById('floorPlanCanvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        let newX = e.clientX - canvasRect.left - offsetX;
        let newY = e.clientY - canvasRect.top - offsetY;
        
        newX = Math.max(0, Math.min(newX, canvasRect.width - dragFloorWall.offsetWidth));
        newY = Math.max(0, Math.min(newY, canvasRect.height - dragFloorWall.offsetHeight));
        
        dragFloorWall.style.left = newX + 'px';
        dragFloorWall.style.top = newY + 'px';
    }
    
    // 회전 (천천히)
    if (isRotating && selectedFloorWall) {
        const rect = selectedFloorWall.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
        const angleDelta = currentAngle - rotationStartAngle;
        
        // 회전 속도를 0.3배로 줄임 (천천히)
        const rotation = initialRotation + (angleDelta * 0.3);
        
        selectedFloorWall.style.transform = `rotate(${rotation}deg)`;
        selectedFloorWall.dataset.rotation = rotation;
    }
});

document.addEventListener('mouseup', () => {
    dragFrame = null;
    dragFloorWall = null;
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

// 초기 화면 설정
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.header').style.display = 'none';
    document.querySelector('.tabs').style.display = 'none';
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';  // inline으로 초기 숨김
    });
    document.getElementById('initial-screen').style.display = 'flex';
});

function startNewProject() {
    document.getElementById('initial-screen').style.display = 'none';
    document.querySelector('.header').style.display = 'block';
    document.querySelector('.tabs').style.display = 'flex';
    switchTab('wall-editor');  // 기본으로 벽 관리 탭 열기
}

function loadExistingProject() {
    document.getElementById('projectFileInput').click();
}