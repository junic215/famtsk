export const pseudoAI = {
    async generateMultiUserComments(usersData, activityLog) {
        // usersData: array of { user, today_points, goals }
        return usersData.map(data => {
            const { user, today_points, goals } = data;
            const activeGoal = goals.find(g => g.status === 'pending');
            
            let praise = today_points > 10 ? `素晴らしい！今日は${today_points}ptも貢献したね。` : `お疲れ様！一歩ずつ進んでるね。`;
            let suggestion = today_points < 5 ? "明日はもっと高得点のタスクを狙ってみよう！" : "その調子で続けていこう。";
            let advice = activeGoal ? `目標の${activeGoal.name}まであと少し！` : "新しい目標を設定してみよう。";

            return {
                userName: user.name,
                comment: `
                    <div class="user-ai-card">
                        <h4>${user.name}さんへのレポート</h4>
                        <p>💪 <strong>褒め：</strong> ${praise}</p>
                        <p>💡 <strong>改善：</strong> ${suggestion}</p>
                        <p>🎯 <strong>助言：</strong> ${advice}</p>
                    </div>
                `
            };
        });
    }
};
