import { db } from './supabase.js';
import { pseudoAI } from './ai.js';

const USERS = [
    { id: 'mama', name: 'ママ' },
    { id: 'papa', name: 'パパ' },
    { id: 'ken', name: 'けん' },
    { id: 'tsuki', name: 'つき' }
];

const DAILY_TASKS = [
    { id: 'd1', name: '掃除機', points: 2 },
    { id: 'd2', name: 'おもちゃ片付け', points: 5 },
    { id: 'd3', name: 'ゴミ出し', points: 2 },
    { id: 'd4', name: '花の水やり', points: 4 },
    { id: 'd5', name: '宿題', points: 6 },
    { id: 'd6', name: 'ピアノ練習', points: 7 },
    { id: 'd7', name: 'お風呂掃除', points: 2 },
    { id: 'd8', name: '食器片付け', points: 3 },
    { id: 'd9', name: '洗濯物たたみ', points: 3 },
    { id: 'd10', name: '歯磨き', points: 4 }
];

const REGULAR_TASKS = [
    { id: 'r1', name: 'トイレ掃除', points: 4 },
    { id: 'r2', name: '花の肥料やり', points: 2 },
    { id: 'r3', name: 'お風呂のカビ取り', points: 6 },
    { id: 'r4', name: '冷蔵庫整理', points: 4 },
    { id: 'r5', name: '布団干し', points: 4 },
    { id: 'r6', name: 'コンロ掃除', points: 4 },
    { id: 'r7', name: '玄関掃除', points: 4 },
    { id: 'r8', name: '草むしり', points: 8 },
    { id: 'r9', name: 'ケルヒャー', points: 10 },
    { id: 'r10', name: '窓拭き', points: 6 }
];

const dailyBody = document.getElementById('daily-body');
const regularBody = document.getElementById('regular-body');
const rankingList = document.getElementById('ranking-list');
const goalsContainer = document.getElementById('goals-container');
const submitBtn = document.getElementById('submit-all');

async function init() {
    renderMatrix();
    renderSidebar();
    renderGoals();
    setupEventListeners();
}

function renderMatrix() {
    // Render Daily Matrix
    dailyBody.innerHTML = DAILY_TASKS.map(task => `
        <tr>
            <td class="sticky-col">${task.name}</td>
            ${USERS.map(user => `
                <td>
                    <div class="cell-check" data-user="${user.id}" data-task="${task.id}" data-type="daily"></div>
                </td>
            `).join('')}
            <td><span class="pts-tag">${task.points}pt</span></td>
        </tr>
    `).join('');

    // Render Regular Matrix
    regularBody.innerHTML = REGULAR_TASKS.map(task => `
        <tr>
            <td class="sticky-col">${task.name}</td>
            ${USERS.map(user => `
                <td>
                    <div class="cell-check" data-user="${user.id}" data-task="${task.id}" data-type="regular"></div>
                </td>
            `).join('')}
            <td class="last-done-cell">${db.getRegularLastDone(task.id)}</td>
        </tr>
    `).join('');

    // Add Toggle Event
    document.querySelectorAll('.cell-check').forEach(cell => {
        cell.addEventListener('click', () => cell.classList.toggle('checked'));
    });
}

async function renderSidebar() {
    const users = await db.getUsers();
    rankingList.innerHTML = users.sort((a, b) => b.total_points - a.total_points).map((u, i) => `
        <div class="ranking-item">
            <span class="rank">${i + 1}</span>
            <span class="name">${u.name}</span>
            <span class="pts">${u.total_points}pt</span>
        </div>
    `).join('');
}

async function renderGoals() {
    const users = await db.getUsers();
    goalsContainer.innerHTML = await Promise.all(users.map(async user => {
        const rewards = await db.getRewards(user.id);
        const goal = rewards.find(r => r.status === 'pending') || { name: 'なし', points: 100 };
        const progress = Math.min(100, (user.total_points / goal.points) * 100);
        return `
            <div class="goal-card">
                <div class="user-info">
                    <strong>${user.name}</strong>
                    <span class="points">${user.total_points}pt</span>
                </div>
                <div class="goal-name">🎯 ${goal.name}</div>
                <div class="progress-bar">
                    <div class="progress-inner" style="width: ${progress}%"></div>
                </div>
                <div class="remaining">あと ${Math.max(0, goal.points - user.total_points)}pt</div>
            </div>
        `;
    })).then(htmls => htmls.join(''));
}

async function handleSubmit() {
    const users = await db.getUsers();
    const batchUpdates = {}; // userId -> points

    // Initialize point map
    USERS.forEach(u => batchUpdates[u.id] = 0);

    // Calculate points from checked cells
    document.querySelectorAll('.cell-check.checked').forEach(cell => {
        const userId = cell.dataset.user;
        const taskId = cell.dataset.task;
        const type = cell.dataset.type;
        const task = [...DAILY_TASKS, ...REGULAR_TASKS].find(t => t.id === taskId);
        
        batchUpdates[userId] += task.points;
        if (type === 'regular') db.updateRegularTaskDate(taskId);
    });

    // Save points
    const reportData = [];
    for (const userId of Object.keys(batchUpdates)) {
        const pts = batchUpdates[userId];
        if (pts > 0) {
            await db.addPoints(userId, pts);
        }
        const user = await db.getUser(userId);
        const goals = await db.getRewards(userId);
        reportData.push({ user, today_points: pts, goals });
    }

    // AI Analysis
    const aiReports = await pseudoAI.generateMultiUserComments(reportData);
    const container = document.getElementById('ai-comments-container');
    container.innerHTML = aiReports.map(r => r.comment).join('');
    
    document.getElementById('ai-modal').style.display = 'flex';
    
    // Check achievements
    for (const data of reportData) {
        const activeGoal = data.goals.find(g => g.status === 'pending');
        if (activeGoal && data.user.total_points >= activeGoal.points) {
            showAchievement(data.user, activeGoal);
        }
    }

    renderSidebar();
    renderGoals();
    renderMatrix(); // Refresh dates
}

function showAchievement(user, goal) {
    const details = document.getElementById('achievement-details');
    details.innerHTML = `
        <p><strong>${user.name}</strong>さんが目標を達成しました！</p>
        <p>「${goal.name}」のご褒美をゲットです！</p>
    `;
    window.claimUser = user.id;
    window.claimGoal = goal;
    document.getElementById('achievement-modal').style.display = 'flex';
}

function setupEventListeners() {
    submitBtn.addEventListener('click', handleSubmit);
    document.getElementById('close-ai-modal').addEventListener('click', () => {
        document.getElementById('ai-modal').style.display = 'none';
    });
    
    document.getElementById('claim-btn').addEventListener('click', async () => {
        await db.deductPoints(window.claimUser, window.claimGoal.points);
        await db.deleteReward(window.claimGoal.id);
        document.getElementById('achievement-modal').style.display = 'none';
        renderGoals();
        renderSidebar();
    });

    document.getElementById('manage-rewards-btn').addEventListener('click', () => {
        // Simple goal adder for demo
        alert('目標追加機能は詳細画面で実装予定です。');
    });

    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('reward-modal').style.display = 'none';
    });
}

init();
