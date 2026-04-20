const SUPABASE_URL = 'https://YOUR_SUPABASE_PROJECT_URL.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const mockDB = {
    users: [
        { id: 'mama', name: 'ママ', total_points: 0, today_points: 0, yesterday_points: 0 },
        { id: 'papa', name: 'パパ', total_points: 0, today_points: 0, yesterday_points: 0 },
        { id: 'ken', name: 'けんちゃん', total_points: 0, today_points: 0, yesterday_points: 0 },
        { id: 'tsuki', name: 'つきちゃん', total_points: 0, today_points: 0, yesterday_points: 0 }
    ],
    rewards: [],
    history: [],
    regular_last_done: {}
};

let state = JSON.parse(localStorage.getItem('famtsk_state')) || mockDB;

function saveState() {
    localStorage.setItem('famtsk_state', JSON.stringify(state));
}

export const db = {
    async getUsers() { return state.users; },
    async getUser(id) { return state.users.find(u => u.id === id); },
    async addPoints(userId, points) {
        const user = state.users.find(u => u.id === userId);
        if (user) { user.total_points += points; user.today_points += points; saveState(); }
        return user;
    },
    async deductPoints(userId, points) {
        const user = state.users.find(u => u.id === userId);
        if (user) { user.total_points = Math.max(0, user.total_points - points); saveState(); }
        return user;
    },
    async getRewards(userId) { return state.rewards.filter(r => r.userId === userId); },
    async addReward(userId, name, points) {
        const reward = { id: Date.now(), userId, name, points, status: 'pending' };
        state.rewards.push(reward);
        saveState();
        return reward;
    },
    async deleteReward(rewardId) {
        state.rewards = state.rewards.filter(r => r.id !== rewardId);
        saveState();
    },
    async updateRegularTaskDate(taskId) {
        state.regular_last_done[taskId] = new Date().toLocaleDateString();
        saveState();
    },
    getRegularLastDone(taskId) { return state.regular_last_done[taskId] || '未実施'; }
};
