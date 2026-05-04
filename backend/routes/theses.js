import express from 'express';
import { thesesByUniversityCodeGet } from '../database/services/thesisService.js';
import { validUniCodes } from '../config/universities.js';

const router = express.Router();

/**
 * GET /theses/uni/:uni
 * 
 * Get theses by university with limit
 * 
 * Query parameters:
 * - rpp: Results per page, capped at 200 (default: 30)
 * 
 * Response:
 * - Array of thesis objects mapped for frontend (limited by rpp)
 * - Each thesis includes: thesis, ruleScore, ruleLabel, ruleReasons,
 *   mlProbability, finalLabel, _isCollaboration
 * 
 * Status codes:
 * - 200: Success
 * - 400: Invalid university code
 * - 404: No theses found
 * - 500: Server error
 */
router.get('/uni/:uni', (req, res) => {
	const uniCode = req.params.uni;
	const rpp = Math.min(parseInt(String(req.query.rpp || '30'), 10) || 30, 200);

	console.log(`[Theses Route] GET /theses/uni/${uniCode}`, { rpp });

	// Validate university code
	const isKnownUni = validUniCodes.includes(encodeURIComponent(uniCode));
	if (!isKnownUni) {
		console.warn(`[Theses Route] Unknown university code: ${uniCode}`);
		return res.status(400).json({ error: `Unknown university code: ${uniCode}` });
	}

	try {
		// Call service layer (DB query + mapping + sorting)
		const thesesWithScores = thesesByUniversityCodeGet(uniCode, rpp);

		if (thesesWithScores.length === 0) {
			console.warn(`[Theses Route] No thesis data found for ${uniCode}`);
			return res.status(404).json({ 
				error: `No thesis data found for university ${uniCode}`
			});
		}

		console.log(`[Theses Route] Returning ${thesesWithScores.length} theses for ${uniCode}`);
		return res.json(thesesWithScores);

	} catch (error) {
		console.error(`[Theses Route] Error fetching theses for ${uniCode}:`, error);
		return res.status(500).json({ error: 'Failed to fetch theses from database' });
	}
});

/**
 * GET /theses/uni/:uni/all
 * 
 * Get all theses for a university without pagination
 * 
 * Response: Array of all theses for university with stored labels/scores
 */
router.get('/uni/:uni/all', (req, res) => {
	const uniCode = req.params.uni;

	console.log(`[Theses Route] GET /theses/uni/${uniCode}/all`);

	// Validate university code
	const isKnownUni = validUniCodes.includes(encodeURIComponent(uniCode));
	if (!isKnownUni) {
		return res.status(400).json({ error: `Unknown university code: ${uniCode}` });
	}

	try {
		const thesesWithScores = thesesByUniversityCodeGet(uniCode);

		if (thesesWithScores.length === 0) {
			return res.status(404).json({ 
				error: `No thesis data found for university ${uniCode}`
			});
		}

		console.log(`[Theses Route] Returning ${thesesWithScores.length} all theses for ${uniCode}`);
		return res.json(thesesWithScores);

	} catch (error) {
		console.error(`[Theses Route] Error fetching all theses for ${uniCode}:`, error);
		return res.status(500).json({ error: 'Failed to fetch theses from database' });
	}
});

export default router;
