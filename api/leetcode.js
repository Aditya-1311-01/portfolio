// Vercel serverless function: GET /api/leetcode?user=aditya_6532
const QUERY = `query($u:String!){
  matchedUser(username:$u){
    username
    profile{ranking}
    submitStatsGlobal{acSubmissionNum{difficulty count}}
    tagProblemCounts{
      advanced{tagName problemsSolved}
      intermediate{tagName problemsSolved}
      fundamental{tagName problemsSolved}
    }
    submissionCalendar
  }
  allQuestionsCount{difficulty count}
  userContestRanking(username:$u){rating attendedContestsCount topPercentage}
}`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  const user = String(req.query.user || 'aditya_6532').replace(/[^\w-]/g, '');
  try {
    const r = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
      body: JSON.stringify({ query: QUERY, variables: { u: user } }),
    });
    const j = await r.json();
    const m = j && j.data && j.data.matchedUser;
    if (!m) return res.status(404).json({ error: 'user not found' });
    const by = {};
    m.submitStatsGlobal.acSubmissionNum.forEach(x => (by[x.difficulty] = x.count));
    const tot = {};
    j.data.allQuestionsCount.forEach(x => (tot[x.difficulty] = x.count));
    const t = m.tagProblemCounts;
    const topics = [...t.advanced, ...t.intermediate, ...t.fundamental]
      .map(x => ({ name: x.tagName, count: x.problemsSolved }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    const c = j.data.userContestRanking;
    res.status(200).json({
      user: m.username,
      ranking: m.profile.ranking,
      solved: { all: by.All, easy: by.Easy, medium: by.Medium, hard: by.Hard },
      totals: { all: tot.All, easy: tot.Easy, medium: tot.Medium, hard: tot.Hard },
      topics,
      calendar: JSON.parse(m.submissionCalendar || '{}'),
      contest: c ? { rating: Math.round(c.rating), attended: c.attendedContestsCount } : null,
    });
  } catch (e) {
    res.status(502).json({ error: 'LeetCode request failed' });
  }
};
