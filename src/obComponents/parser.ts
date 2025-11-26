/**
 * Unified parser for tasks and list items in Obsidian Big Calendar
 * Provides high-performance parsing of lists, tasks, times, dates, and text content
 */

import {moment, Notice} from 'obsidian';
import {BigCalendarSettings} from '@/setting';

/**
 * Represents the status of a task
 */
export enum TaskStatus {
  // Standard statuses
  Todo = 'Todo',
  Done = 'Done',
  Cancelled = 'Cancelled',
  Forwarded = 'Forwarded',
  Deferred = 'Deferred',
  InProgress = 'InProgress',
  Question = 'Question',
  // Additional statuses
  Important = 'Important',
  Info = 'Info',
  Bookmark = 'Bookmark',
  Pro = 'Pro',
  Con = 'Con',
  Brainstorming = 'Brainstorming',
  Example = 'Example',
  Quote = 'Quote',
  Note = 'Note',
  Win = 'Win',
  Lose = 'Lose',
  Add = 'Add',
  Reviewed = 'Reviewed',
  // Default for non-recognized status characters
  Unknown = 'Unknown',
  // Non-task
  NotATask = 'NotATask',
}

/**
 * Maps status characters to TaskStatus enum values
 */
const STATUS_MAPPING: Record<string, TaskStatus> = {
  ' ': TaskStatus.Todo,
  x: TaskStatus.Done,
  X: TaskStatus.Done,
  '-': TaskStatus.Cancelled,
  '>': TaskStatus.Forwarded,
  D: TaskStatus.Deferred,
  '/': TaskStatus.InProgress,
  '?': TaskStatus.Question,
  '!': TaskStatus.Important,
  i: TaskStatus.Info,
  B: TaskStatus.Bookmark,
  P: TaskStatus.Pro,
  C: TaskStatus.Con,
  b: TaskStatus.Brainstorming,
  E: TaskStatus.Example,
  Q: TaskStatus.Quote,
  N: TaskStatus.Note,
  W: TaskStatus.Win,
  L: TaskStatus.Lose,
  '+': TaskStatus.Add,
  R: TaskStatus.Reviewed,
};

/**
 * Represents time information
 */
export interface TimeInfo {
  hour: number;
  minute: number;
  second?: number;
  isEndTime?: boolean;
}

/**
 * Represents date information
 */
export interface DateInfo {
  date: string; // YYYY-MM-DD format
  moment: moment.Moment;
  type: 'date';
  rawMatch?: string;
}

/**
 * Unified representation of a parsed line item
 */
export interface ParsedLine {
  // Basic information
  originalLine: string;
  content: string;
  indentation: string;

  // Task-specific information
  isTask: boolean;
  taskStatus?: TaskStatus;
  statusCharacter?: string;

  // Time and date information
  startTime?: TimeInfo;
  endTime?: TimeInfo;
  dates: DateInfo[];

  // Markers
  hasRecurrence: boolean;
  recurrenceRule?: string;
  blockLink?: string;

  // Line type information
  isListItem: boolean;
  listMarker: string;
}

export interface ListEntry {
  header: string;
  body: string;
}

/**
 * Regex patterns for parsing
 */
export const PATTERNS = {
  // Basic line structure
  LIST_ITEM: /^(\s*)(-|\*|\+|\d+\.)\s+(.*)$/,
  TASK: /^(\s*)(-|\*|\+|\d+\.)\s+\[(.)\]\s+(.*)$/,

  // Time patterns
  TIME_STANDARD: /(\d{1,2}):(\d{2})(?::(\d{2}))?/g,
  TIME_WITH_TAG: /<time>(\d{1,2}):(\d{2})(?::(\d{2}))?<\/time>/g,
  END_TIME: /⏲\s?(\d{1,2}):(\d{2})(?::(\d{2}))?/g,
  TIME_RANGE: /(\d{1,2}):(\d{2})(?::(\d{2}))?-(\d{1,2}):(\d{2})(?::(\d{2}))?/g,

  // Date patterns
  DUE_DATE: /\s?@{(\d{4}-\d{2}-\d{2})}/g,
  _DUE_DATE: /\s(📅|📆|(@{)|(\[due::))\s?(\d{4}-\d{2}-\d{2})(\])?/g,
  START_DATE: /🛫\s?(\d{4}-\d{2}-\d{2})/g,
  SCHEDULED_DATE: /[⏳⌛]\s?(\d{4}-\d{2}-\d{2})/g,
  DONE_DATE: /✅\s?(\d{4}-\d{2}-\d{2})/g,

  // Additional markers
  RECURRENCE: /🔁([a-zA-Z0-9, !]+)$/,
  BLOCK_LINK: /\s\^([a-zA-Z0-9-]+)$/,
};

/**
 * Extracts all dates from a line
 *
 * @param line The text line to parse
 * @returns Array of date information objects
 */
export function extractDates(line: string): DateInfo[] {
  const dates: DateInfo[] = [];

  // Extract due dates
  const dueDateMatches = [...line.matchAll(PATTERNS.DUE_DATE)];

  for (const match of dueDateMatches) {
    dates.push({
      date: match[1],
      moment: moment(match[1], 'YYYY-MM-DD'),
      type: 'date',
      rawMatch: match[0],
    });
  }

  return dates;
}

/**
 * Cleans the content by removing metadata markers
 *
 * @param content The original content text
 * @param dates Array of date information to remove
 * @param recurrenceRule Recurrence rule to remove (if present)
 * @param blockLink Block link to remove (if present)
 * @returns Cleaned content text
 */
export function cleanContent(content: string, dates: DateInfo[]): string {
  let result = content;

  // Remove dates
  for (const date of dates) {
    if (date.rawMatch) {
      result = result.replace(date.rawMatch, '');
    }
  }

  // Clean up any excess whitespace
  return result.trim();
}

/**
 * Parses a line for task or list item information
 *
 * @param line The text line to parse
 * @returns A ParsedLine object with all extracted information
 */
export function parseLine(line: ListEntry): ParsedLine {
  // Initialize the result object
  const result: ParsedLine = {
    originalLine: line.header + line.body,
    content: line.header.length == 0 ? line.body : line.header,
    indentation: '',
    isTask: false,
    isListItem: false,
    listMarker: '',
    dates: [],
    hasRecurrence: false,
  };

  // Extract dates
  result.dates = extractDates(line.body);
  result.content = cleanContent(result.content, result.dates);

  return result;
}

/**
 * Checks if a line contains a token that indicates items below it should be parsed
 *
 * @param line The line to check
 * @param settings Plugin settings
 * @returns Boolean indicating if the line contains the parse below token
 */
export function lineContainsParseBelowToken(line: string, settings: BigCalendarSettings): boolean {
  if (settings.ProcessEntriesBelow === '') {
    return true;
  }

  try {
    const pattern = new RegExp(settings.ProcessEntriesBelow.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1'), '');
    return pattern.test(line);
  } catch (e) {
    console.error('Invalid regex pattern in ProcessEntriesBelow setting', e);
    return false;
  }
}

/**
 * Checks if a line contains time information or is a task
 *
 * @param line The line to check
 * @returns Boolean indicating if the line contains time information or is a task
 */
export function lineContainsTime(line: string): boolean {
  // Check if line contains time information or is a task
  return (
    PATTERNS.TIME_STANDARD.test(line) ||
    PATTERNS.TIME_WITH_TAG.test(line) ||
    PATTERNS.DUE_DATE.test(line) ||
    PATTERNS._DUE_DATE.test(line) ||
    PATTERNS.END_TIME.test(line) ||
    PATTERNS.TASK.test(line)
  );
}

/**
 * Converts a ParsedLine to an event object
 *
 * @param parsedLine The parsed line
 * @param defaultDate The default date to use if no date is found
 * @param lineIndex The index of the line in the file (for ID generation)
 * @returns An event object compatible with full calendar
 */
export function convertToEvent(parsedLine: ParsedLine, lineIndex: number, path: string): Model.Event | null {
  // Check if there's due date information
  const hasDate = parsedLine.dates.some((d) => d.type === 'date');

  if (!hasDate) {
    return null;
  }

  // Determine the start date and end date
  let startDate = parsedLine.dates[0].moment.clone();
  let endDate = parsedLine.dates[0].moment.clone();
  let dueDate = parsedLine.dates[0].moment.clone();

  // For tasks without time information but with due date, handle as all-day
  let allDay = true;

  // Generate unique ID
  const id = `${startDate.format('YYYYMMDDHHmm')}00${lineIndex}`;

  // Determine event type
  let eventType = 'default';

  // Create event object
  const event: Model.Event = {
    id,
    title: parsedLine.content,
    start: startDate.toDate(),
    end: endDate.toDate(),
    allDay,
    eventType,
    path,
  };

  if (parsedLine.blockLink) {
    event.blockLink = parsedLine.blockLink;
  }

  return event;
}

/**
 * Gets the original task mark character based on the event type
 *
 * @param event The event object
 * @returns The mark character corresponding to the event type
 */
export function getMarkBasedOnEvent(eventType: string): string | null {
  if (!eventType || !eventType.startsWith('TASK-')) {
    return null;
  }

  const taskType = eventType.split('-')[1];

  switch (taskType) {
    case 'TODO':
      return ' ';
    case 'DONE':
      return 'x';
    case 'CANCELLED':
      return '-';
    case 'IN_PROGRESS':
      return '/';
    case 'IMPORTANT':
      return '!';
    case 'QUESTION':
      return '?';
    case 'REVIEW':
      return '>';
    case 'IDEA':
      return 'i';
    case 'PRO':
      return '+';
    case 'CON':
      return '-';
    case 'BRAINSTORMING':
      return 'b';
    case 'EXAMPLE':
      return 'e';
    case 'QUOTE':
      return 'q';
    case 'NOTE':
      return 'n';
    case 'WIN':
      return 'w';
    case 'LOSE':
      return 'l';
    default:
      return ' ';
  }
}
