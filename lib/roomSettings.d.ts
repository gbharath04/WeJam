export type RoomSettings = {
  accent: string;
  banner: string;
  layout: string;
  backgroundImage: string;
  cardImage: string;
  roomCardImage: string;
};

export const DEFAULT_ROOM_SETTINGS: RoomSettings;

export function sanitizeRoomSettings(partial: Partial<RoomSettings>): Partial<RoomSettings>;

export function normalizeRoomSettings(settings: Partial<RoomSettings> | null | undefined): RoomSettings;
