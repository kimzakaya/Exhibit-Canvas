// ==================== 전역 변수 ====================
const scale = 0.05; // 1cm = 0.5px
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

// 사람 모형 관련
let persons = []; // 벽에 배치된 사람 모형들
let selectedPerson = null;
let dragPerson = null;

// 드래그 박스 선택 관련
let isBoxSelecting = false;
let boxSelectStart = { x: 0, y: 0 };
let selectionBox = null;

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

// 컨텍스트 메뉴 관련
let contextMenuTarget = null;

// 이미지 크롭 관련
let selectedFrameForCrop = null;
let cropper = null;

// ==================== 탭 전환 ====================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const selectedTab = document.getElementById(tabId);
    selectedTab.classList.add('active');
    selectedTab.style.display = 'block';
    
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
            width: parseFloat(frame.dataset.width || frame.style.width),
            height: parseFloat(frame.dataset.height || frame.style.height),
            left: parseFloat(frame.style.left),
            top: parseFloat(frame.style.top),
            image: frame.dataset.image || null
        }))
    };
    
    currentWallId = wallId;
    updateWallSelect();
    
    // 벽 저장 후 초기 상태로 리셋
    document.getElementById('wallSelect').value = '';
    currentWallId = null;
    document.getElementById('wallName').value = '';
    document.getElementById('wallWidth').value = 400;
    document.getElementById('wallHeight').value = 300;
    clearAllFrames();
    
    updateWall();
    updateInfo();
    updateWallList();
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
    
    // 현재 작업 중인 벽이 있으면 먼저 자동 저장
    if (currentWallId && walls[currentWallId]) {
        const currentWallName = document.getElementById('wallName').value.trim();
        if (currentWallName) {
            walls[currentWallId].frames = frames.map(frame => ({
                width: parseFloat(frame.dataset.width || frame.style.width),
                height: parseFloat(frame.dataset.height || frame.style.height),
                left: parseFloat(frame.style.left),
                top: parseFloat(frame.style.top),
                image: frame.dataset.image || null
            }));
        }
    }
    
    if (!wallId) {
        currentWallId = null;
        document.getElementById('wallName').value = '';
        document.getElementById('wallWidth').value = 400;
        document.getElementById('wallHeight').value = 300;
        clearAllFrames();
        updateWall();
        updateInfo();
        return;
    }
    
    const wall = walls[wallId];
    if (!wall) return;
    
    currentWallId = wallId;
    document.getElementById('wallName').value = wall.name;
    document.getElementById('wallWidth').value = wall.width;
    document.getElementById('wallHeight').value = wall.height;
    
    clearAllFrames();
    wall.frames.forEach(frameData => {
        addFrameWithData(frameData);
    });
    
    updateWall();
    updateInfo();
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
        document.getElementById('wallWidth').value = 400;
        document.getElementById('wallHeight').value = 300;
        clearAllFrames();
        updateWallSelect();
        updateWall();
        updateInfo();
        updateWallList();
        
        wallEditorZoom = 1;
        wallEditorPanX = 0;
        wallEditorPanY = 0;
        updateWallEditorTransform();
        document.getElementById('wallEditorZoomValue').textContent = '100%';
    }
}

// ==================== 벽 크기 업데이트 ====================
function updateWall() {
    const width = document.getElementById('wallWidth').value;
    const height = document.getElementById('wallHeight').value;
    const wall = document.getElementById('wall');
    
    wall.style.width = width + 'px';  // 직접 px 사용
    wall.style.height = height + 'px';  // 직접 px 사용
    
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
    a.download = `Exhibit Canvas - exhibition-project-${Date.now()}.json`;
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
            
            walls = project.walls;
            currentWallId = null;
            updateWallSelect();
            
            document.getElementById('spaceWidth').value = project.floorPlan.spaceWidth;
            document.getElementById('spaceHeight').value = project.floorPlan.spaceHeight;
            updateFloorPlan();
            
            floorWalls.forEach(wall => wall.remove());
            floorWalls = [];
            
            project.floorPlan.walls.forEach(wallData => {
                const wallInfo = walls[wallData.wallId];
                if (!wallInfo) return;
                
                const canvas = document.getElementById('floorPlanCanvas');
                const thickness = 20;
                const wallWidth = wallInfo.width * 0.5;  // 평면도 스케일
                
                const floorWall = document.createElement('div');
                floorWall.className = 'floor-wall';
                floorWall.style.width = wallWidth + 'px';
                floorWall.style.height = thickness + 'px';
                floorWall.style.left = wallData.left + 'px';
                floorWall.style.top = wallData.top + 'px';
                floorWall.style.transform = `rotate(${wallData.rotation}deg)`;
                floorWall.innerHTML = `
                    <span>${wallInfo.name}</span>
                    <div class="rotation-handle"></div>
                `;
                
                floorWall.dataset.wallId = wallData.wallId;
                floorWall.dataset.rotation = wallData.rotation;
                floorWall.dataset.wallWidth = wallWidth;  // 실제 너비 저장
                floorWall.dataset.wallHeight = thickness;  // 실제 높이 저장
                
                floorWall.addEventListener('mousedown', startDragFloorWall);
                floorWall.addEventListener('click', selectFloorWall);
                
                const rotationHandle = floorWall.querySelector('.rotation-handle');
                rotationHandle.addEventListener('mousedown', startRotation);
                
                canvas.appendChild(floorWall);
                floorWalls.push(floorWall);
            });
            
            document.getElementById('initial-screen').style.display = 'none';
            document.querySelector('.header').style.display = 'block';
            document.querySelector('.tabs').style.display = 'flex';
            switchTab('floor-plan');
            updateWallList();

            alert('프로젝트를 불러왔습니다!');
        } catch (error) {
            alert('파일을 읽는 중 오류가 발생했습니다: ' + error.message);
        }
    };
    reader.readAsText(file);
    
    event.target.value = '';
}

function startNewProject() {
    document.getElementById('initial-screen').style.display = 'none';
    document.querySelector('.header').style.display = 'block';
    document.querySelector('.tabs').style.display = 'flex';
    switchTab('wall-editor');
}

function loadExistingProject() {
    document.getElementById('projectFileInput').click();
}