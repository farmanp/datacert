import { read, utils, WorkBook } from 'xlsx';

// Worker globals for caching
interface ExcelWorkerGlobals {
  workbookCache: WorkBook | null;
}

const workerGlobals: ExcelWorkerGlobals = {
  workbookCache: null
};

self.onmessage = async (e: MessageEvent) => {
  const { type, data } = e.data;

  try {
    switch (type) {
      case 'parse_workbook': {
        const arrayBuffer = data;
        const workbook = read(arrayBuffer, { type: 'array', dense: true });
        workerGlobals.workbookCache = workbook;

        const sheetNames = workbook.SheetNames;

        self.postMessage({
          type: 'workbook_parsed',
          sheetNames
        });
        break;
      }

      case 'parse_sheet': {
        const { workbookBuffer, selectedSheet } = data;

        let wb: WorkBook;
        if (workerGlobals.workbookCache) {
          wb = workerGlobals.workbookCache;
        } else {
          wb = read(workbookBuffer, { type: 'array', dense: true });
          workerGlobals.workbookCache = wb;
        }

        const sheet = wb.Sheets[selectedSheet];
        if (!sheet) {
          throw new Error(`Sheet "${selectedSheet}" not found`);
        }

        const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

        if (rows.length === 0) {
          self.postMessage({ type: 'sheet_processed', headers: [], rows: [] });
          return;
        }

        const headers = rows[0].map(cell => String(cell));
        const dataRows = rows.slice(1).map(row => row.map(cell => String(cell)));

        self.postMessage({
          type: 'sheet_processed',
          headers,
          rows: dataRows
        });
        break;
      }

      case 'clear_cache':
        workerGlobals.workbookCache = null;
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: (error as Error).message });
  }
};
