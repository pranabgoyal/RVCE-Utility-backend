const express = require('express');
const router = express.Router();
const axios = require('axios');

// Repository Configuration
const REPOS = {
    '1': { owner: 'pranabgoyal', repo: '1st-year-resources-2022-scheme-rvce' },
    '2': { owner: 'pranabgoyal', repo: '2nd-year-resources-2022-scheme-rvce' },
    '3': { owner: 'pranabgoyal', repo: '3rd-year-resources-2022-scheme-rvce' },
    '4': { owner: 'pranabgoyal', repo: '4th_year_resources_2022_scheme_RVCE' },
    'mock-papers': { owner: 'pranabgoyal', repo: 'RVCE-Utility-Mock-Papers' }
};

// Simple In-Memory Cache (Duration: 5 minutes)
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;
const TREE_CACHE = new Map(); // Separate cache for full repo trees

// Search Endpoint (Must be before /:year* wildcard)
router.get('/search', async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const query = q.toLowerCase();
    const allResults = [];

    try {
        // Iterate over all configured repos
        for (const [yearId, config] of Object.entries(REPOS)) {
            // Skip if it's the mock-papers repo for now (or include it if desired)
            // Including everything:

            const cacheKey = `tree:${yearId}`;
            let tree = [];

            // Check Cache
            if (TREE_CACHE.has(cacheKey) && (Date.now() - TREE_CACHE.get(cacheKey).timestamp < 3600000)) { // 1 hour cache
                tree = TREE_CACHE.get(cacheKey).data;
            } else {
                // Fetch Recursive Tree
                // Defaulting to 'main' branch. If fails, could try 'master'.
                try {
                    const treeUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/main?recursive=1`;
                    const treeRes = await axios.get(treeUrl, {
                        headers: { 'Accept': 'application/vnd.github.v3+json' }
                    });
                    tree = treeRes.data.tree;
                    TREE_CACHE.set(cacheKey, { data: tree, timestamp: Date.now() });
                } catch (err) {
                    console.error(`Failed to fetch tree for ${yearId}:`, err.message);
                    continue; // Skip this repo if failed
                }
            }

            // Filter Tree
            const matches = tree.filter(item =>
                item.type === 'blob' && // only files
                item.path.toLowerCase().includes(query)
            ).map(item => ({
                name: item.path.split('/').pop(), // filename
                path: item.path,
                type: 'file',
                download_url: `https://raw.githubusercontent.com/${config.owner}/${config.repo}/main/${item.path}`,
                yearId: yearId,
                repoName: config.repo
            }));

            allResults.push(...matches);
        }

        res.json(allResults);

    } catch (err) {
        console.error('Search Error:', err);
        res.status(500).send('Search failed');
    }
});

router.get('/:year*', async (req, res) => {
    try {
        const { year } = req.params;
        // path can be empty or a subpath. 
        // req.params[0] captures the wildcard * (e.g., /Chemistry/Unit1)
        // We acturally need to parse the wildcard carefully.
        // Express routing: /:year/* 
        // if url is /1/Chemistry -> year=1, 0=/Chemistry

        const pathParam = req.params[0] || '';
        const path = pathParam.startsWith('/') ? pathParam.slice(1) : pathParam;

        const repoConfig = REPOS[year];

        if (!repoConfig) {
            return res.status(400).json({ msg: 'Invalid Year. Available years: 1, 2, 3, 4' });
        }

        const cacheKey = `${year}:${path}`;
        if (cache.has(cacheKey)) {
            const { data, timestamp } = cache.get(cacheKey);
            if (Date.now() - timestamp < CACHE_DURATION) {
                // console.log(`Serving from cache: ${cacheKey}`);
                return res.json(data);
            }
        }

        const apiUrl = `https://api.github.com/repos/${repoConfig.owner}/${repoConfig.repo}/contents/${path}`;

        // console.log(`Fetching from GitHub: ${apiUrl}`);

        const response = await axios.get(apiUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                // Add Authorization if rate limits become an issue or for private repos
                // 'Authorization': `token ${process.env.GITHUB_TOKEN}`
            }
        });

        const items = response.data;

        // Transform data if needed, or pass through
        // We typically want: name, type, path, download_url
        const transformed = Array.isArray(items) ? items.map(item => ({
            name: item.name,
            type: item.type, // 'file' or 'dir'
            path: item.path,
            download_url: item.download_url,
            size: item.size
        })) : items; // If it's a single file content

        // Set Cache
        cache.set(cacheKey, { data: transformed, timestamp: Date.now() });

        res.json(transformed);

    } catch (err) {
        console.error('GitHub API Error:', err.message);
        if (err.response && err.response.status === 404) {
            return res.status(404).json({ msg: 'Path not found in repository' });
        }
        res.status(500).send('Failed to fetch data from GitHub');
    }
});

module.exports = router;
