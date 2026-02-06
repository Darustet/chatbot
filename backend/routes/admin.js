import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dashboardFilePath = path.join(__dirname, '../data/dashboard.json');

// GET dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const data = await fs.readFile(dashboardFilePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading dashboard data:', error);
    if (error.code === 'ENOENT') {
      // If file doesn't exist, return default structure
      const defaultData = {
        education: {
          courses: 10,
          workshops: 5
        },
        research_development: {
          projects: 8,
          publications: 15
        },
        common_events: {
          conferences: 3,
          meetups: 7
        }
      };
      
      // Create directory if it doesn't exist
      try {
        await fs.mkdir(path.dirname(dashboardFilePath), { recursive: true });
        // Write default data to file
        await fs.writeFile(dashboardFilePath, JSON.stringify(defaultData, null, 2), 'utf8');
        return res.json(defaultData);
      } catch (writeError) {
        console.error('Error creating default dashboard data:', writeError);
        return res.status(500).json({ message: 'Failed to initialize dashboard data' });
      }
    }
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// UPDATE dashboard data
router.put('/dashboard', async (req, res) => {
  try {
    console.log('Received PUT request to update dashboard data');
    console.log('Request body:', req.body);
    
    const data = req.body;
    
    // Validate input structure
    if (!data || typeof data !== 'object') {
      console.error('Invalid data format received');
      return res.status(400).json({ message: 'Invalid data format' });
    }

    // Simple validation for expected structure
    const requiredSections = ['education', 'research_development', 'common_events'];
    for (const section of requiredSections) {
      if (!data[section] || typeof data[section] !== 'object') {
        console.error(`Missing or invalid section: ${section}`);
        return res.status(400).json({ 
          message: `Missing or invalid section: ${section}` 
        });
      }
    }

    // Make sure directory exists
    await fs.mkdir(path.dirname(dashboardFilePath), { recursive: true });
    
    // Log file path
    console.log('Writing to file:', dashboardFilePath);
    
    // Write to file
    await fs.writeFile(
      dashboardFilePath, 
      JSON.stringify(data, null, 2),
      'utf8'
    );
    
    console.log('Dashboard data updated successfully');
    res.json({ message: 'Dashboard updated successfully' });
  } catch (error) {
    console.error('Error updating dashboard data:', error);
    res.status(500).json({ 
      message: 'Failed to update dashboard data',
      details: error.message 
    });
  }
});

export default router;
