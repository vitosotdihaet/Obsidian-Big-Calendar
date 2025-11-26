import {TFile, Notice, App} from 'obsidian';
import {getDailyNoteSettings} from 'obsidian-daily-notes-interface';
import {getAllLinesFromFile} from '@/utils/fileParser';
import {fileService, globalService, locationService} from '@/services';
import {BigCalendarSettings} from '@/setting';
import {t} from '@/translations/helper';
import {parseLine, ListEntry, convertToEvent} from './parser';

export async function getEventsFromFile(note: TFile | null, events: Model.Event[]): Promise<Model.Event[]> {
  return await safeExecute(async () => {
    if (!note) {
      return [];
    }

    const {vault} = fileService.getState().app;
    const fileContents = await vault.read(note);
    const fileLines = getAllLinesFromFile(fileContents);
    const result: Model.Event[] = [];

    let currentIndex = 0;

    while (currentIndex < fileLines.length) {
      const line = fileLines[currentIndex];

      // Check if this is a list entry (starts with - [ ] or - [x])
      if (line.match(/^\s*-\s+\[.\]/)) {
        // This is a list entry, collect the header and body
        const listEntry: ListEntry = {
          header: '',
          body: '',
        };

        // Extract header from the current line (remove the checkbox part)
        listEntry.header = line.replace(/^\s*-\s+\[.\]\s*/, '').trim();

        // Collect body from subsequent indented lines
        let bodyLines = [];
        let nextIndex = currentIndex + 1;

        while (
          nextIndex < fileLines.length &&
          fileLines[nextIndex].match(/^\s+/) &&
          !fileLines[nextIndex].match(/^\s*-\s+\[.\]/)
        ) {
          bodyLines.push(fileLines[nextIndex].trim());
          nextIndex++;
        }

        listEntry.body = bodyLines.join('\n');

        // Parse the list entry struct instead of just the line
        const parsedLine = parseLine(listEntry);

        try {
          // Convert to event - tasks without time info will be treated as all-day events
          const event = convertToEvent(parsedLine, currentIndex, note.path);

          if (event) {
            result.push(event);
            if (events) {
              events.push(event);
            }
          }
        } catch (error) {
          new Notice('Got error when converting list to event: ' + error);
        }

        // Skip the body lines we've already processed
        currentIndex = nextIndex;
      } else {
        // Not a list entry, process as before
        const parsedLine = parseLine({header: '', body: line});

        try {
          const event = convertToEvent(parsedLine, currentIndex, note.path);

          if (event) {
            result.push(event);
            if (events) {
              events.push(event);
            }
          }
        } catch (error) {
          new Notice('Got error when converting line to event: ' + error);
        }

        currentIndex++;
      }
    }

    return result;
  }, 'Failed to get events from note ' + note);
}

// Function to check if the file metadata matches the filter criteria
async function fileHasMatchingMetadata(
  file: TFile,
  metadataKeys: string[],
  metadataValues: Record<string, string>,
): Promise<boolean> {
  try {
    // Get file metadata
    const app = fileService.getState().app;
    // @ts-ignore - Access to Obsidian's internal API
    const fileCache = app.metadataCache.getFileCache(file);

    if (!fileCache || !fileCache.frontmatter) {
      return false;
    }

    const frontmatter = fileCache.frontmatter;

    // Check if all required metadata keys exist
    if (metadataKeys.length > 0) {
      const hasMissingKey = metadataKeys.some((key) => !Object.prototype.hasOwnProperty.call(frontmatter, key));
      if (hasMissingKey) {
        return false;
      }
    }

    // Check if all metadata key-value pairs match
    if (Object.keys(metadataValues).length > 0) {
      for (const [key, value] of Object.entries(metadataValues)) {
        if (frontmatter[key] !== value) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking file metadata:', error);
    return false;
  }
}

// Check if the event matches the filter criteria
export function eventMatchesFilter(event: Model.Event, filter: Query): boolean {
  // Filter by event type
  if (filter.eventType && event.eventType !== filter.eventType) {
    return false;
  }

  // Filter by content regex
  if (filter.contentRegex) {
    try {
      const regex = new RegExp(filter.contentRegex);
      if (!regex.test(event.title)) {
        return false;
      }
    } catch (error) {
      console.error('Invalid regex pattern:', filter.contentRegex);
      // Invalid regex - we'll skip this filter
    }
  }

  // Filter by folder paths (if event has a path property)
  if (filter.folderPaths && filter.folderPaths.length > 0 && event.path) {
    const matchesAnyFolder = filter.folderPaths.some((folderPath) => event.path!.startsWith(folderPath));
    if (!matchesAnyFolder) {
      return false;
    }
  }

  return true;
}

export async function getEvents(app: App): Promise<Model.Event[]> {
  return await safeExecute(async () => {
    const allEvents: Model.Event[] = [];
    const {folder} = getDailyNoteSettings();
    const filter = locationService.getState().query;

    if (!app) return [];

    // Get all notes
    const allFiles = app.vault.getMarkdownFiles();

    // Process each note
    for (const key in allFiles) {
      if (allFiles[key] instanceof TFile) {
        const file = allFiles[key] as TFile;

        // Get events from the file
        const events = await getEventsFromFile(file, []);
        allEvents.push(...events);
      }
    }

    return allEvents;
  }, 'Failed to get events');
}

// Import this function from elsewhere as it's not defined in the existing getEvents.ts code
async function safeExecute<T>(fn: () => Promise<T>, errorMessage: string): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`${errorMessage}: ${error}`);
    throw error;
  }
}
