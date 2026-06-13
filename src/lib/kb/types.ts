export type KbSection = {
  key: string;
  title: string;
  editable: boolean;
  content: string;
};

/** Shape cru devolvido pelo WF de leitura do KB (`/kb/api/v1/get`). */
export type KbGetRaw = {
  sections: KbSection[] | null;
  sectionsPrevious: KbSection[] | null;
  vertical: string | null;
  legacyContent: string | null;
  updatedAt: string | null;
};
