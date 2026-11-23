/**
 * ค้นหารายการตรวจทางห้องปฏิบัติการ
 * วิธีใช้: ดู README.md ส่วน "Deploy ด้วย Google Apps Script"
 *
 * ตั้งค่า:
 * 1) สร้าง Google Sheet แถวแรกเป็นหัวคอลัมน์
 *    คอลัมน์แรก = ชื่อรายการตรวจ
 *    ต้องมีคอลัมน์ที่มีคำว่า "ภาชนะ"
 * 2) วาง SHEET_ID / SHEET_NAME ให้ถูกต้อง
 * 3) Deploy > New deployment > Web app
 *    Execute as: Me
 *    Who has access: Anyone
 */

var SHEET_ID = 'วาง_ID_ของ_Google_Sheet_ที่นี่';
var SHEET_NAME = 'Sheet1'; // ชื่อชีตที่เก็บรายการตรวจ
var LOG_SHEET_NAME = 'Log'; // ชีตบันทึกการใช้งาน (สร้างอัตโนมัติถ้ายังไม่มี)

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ค้นหารายการตรวจทางห้องปฏิบัติการ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/** คืนค่าเป็น array ของแถว [header, ...rows] */
function getData() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('ไม่พบชีตชื่อ: ' + SHEET_NAME);
  var values = sheet.getDataRange().getDisplayValues();
  // ตัดแถวว่างทั้งหมด
  return values.filter(function (row) {
    return row.some(function (cell) { return String(cell).trim() !== ''; });
  });
}

/** บันทึกสถิติการใช้งานแบบไม่บังคับ */
function logEvent(type, detail, ua) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var log = ss.getSheetByName(LOG_SHEET_NAME);
    if (!log) {
      log = ss.insertSheet(LOG_SHEET_NAME);
      log.appendRow(['Timestamp', 'Type', 'Detail', 'UserAgent']);
    }
    log.appendRow([new Date(), String(type || ''), String(detail || ''), String(ua || '')]);
  } catch (e) {
    // ไม่ให้ logging ทำให้แอปพัง
  }
}
