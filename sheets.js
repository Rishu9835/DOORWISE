import dotenv from 'dotenv';
import { Console } from 'console';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
dotenv.config();

const isRender = process.env.RENDER === 'true';
// const keyPath = isRender
//   ? '/etc/secrets/robotics-club-door-lock-592445d6ec57.json'
//   : path.join('etc', 'secrets', 'robotics-club-door-lock-592445d6ec57.json');

const keyPath = isRender
  ? '/etc/secrets/robotics-club-door-lock-592445d6ec57.json' // Render's expected path
  : path.join('/tmp', 'robotics-club-door-lock-592445d6ec57.json'); // ✅ Writable on Vercel

if (!fs.existsSync(keyPath)) {
  const keyJson = Buffer.from(process.env.GOOGLE_KEY_JSON, "base64").toString("utf-8");
  fs.writeFileSync(keyPath, keyJson);
}
const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = process.env.SPREADSHEET_ID; 
const SHEET_NAME = 'door_log'; // Change as needed

let sheets;

async function initializeSheets() {
    if (!sheets) {
        try {
            const client = await auth.getClient();
            sheets = google.sheets({ version: 'v4', auth: client });
        } catch (error) {
            console.error('Failed to initialize Google Sheets:', error);
            throw error;
        }
    }
    return sheets;
}

async function appendEmailToSheet(regNo) {
    const sheetsInstance = await initializeSheets();
    const now = new Date().toISOString();
    const values = [[regNo, now]]; // 2 columns
    console.log(`Appending to range: ${SHEET_NAME}!A:B`);
    try {
        await sheetsInstance.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:B`,   
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: { values: [[regNo, new Date().toISOString()]] },
    });

        console.log('Email logged to Google Sheets.');
    } catch (err) {
        console.error('Failed to log to Google Sheets:', err);
        throw err;
    }
}


async function getValueSheet(row, col) {
    const sheetsInstance = await initializeSheets();
    try {
        const response = await sheetsInstance.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:C`,
        });
        const rows = response.data.values;
        if (rows.length) {
            // Assuming the password is in the first third column and first row
            return rows[row][col];
        } else {
            throw new Error('No data found');
        }   
    } catch (err) {
        console.error('Failed to retrieve from Google Sheets:', err);
        throw err;
    }
}

async function changeValueSheet(row, col, newValue) {
    const sheetsInstance = await initializeSheets();
    try {
        await sheetsInstance.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!${String.fromCharCode(65 + col)}${row + 1}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[newValue]],
            },
        });
        // console.log('Value updated successfully in Google Sheets.');
    } catch (err) {
        console.error('Failed to update Google Sheets:', err);
        throw err;
    }
}

async function getAllValFromColumn(col) {
    const sheetsInstance = await initializeSheets();
    try {
        const response = await sheetsInstance.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!${String.fromCharCode(65 + col)}:${String.fromCharCode(65 + col)}`, // Specified column only
        });

        const rows = response.data.values;

        if (!rows || rows.length === 0) {
            // console.log('No emails found in column D.');
            return [];
        }
        // handle missing values and flatten
        const data = rows.map(row => row[0] ? row[0] : '');
        return data;
    } catch (err) {
        // console.error('Failed to retrieve emails from Google Sheets:', err);
        throw err;
    }
}

export default {
  appendEmailToSheet,
  getValueSheet,
  changeValueSheet,
  getAllValFromColumn
};

