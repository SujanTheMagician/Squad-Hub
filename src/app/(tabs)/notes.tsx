import { PostList } from '@/components/post-list';
import { TypeColors } from '@/constants/theme';
import type { PostType } from '@/lib/types';

const TYPE_OPTIONS: { value: PostType[]; label: string; color?: string }[] = [
  { value: ['note', 'resource'], label: 'Everything' },
  { value: ['note'], label: 'Notes', color: TypeColors.note },
  { value: ['resource'], label: 'Resources & links', color: TypeColors.resource },
];

export default function NotesScreen() {
  return (
    <PostList
      title="Notes"
      subtitle="Class notes, PDFs and useful links"
      newPostType="note"
      typeOptions={TYPE_OPTIONS}
      emptyIcon="book-outline"
      emptyText="No notes yet. Share your class notes, PDFs or a useful link."
    />
  );
}
