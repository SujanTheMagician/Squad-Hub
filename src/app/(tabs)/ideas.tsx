import { PostList } from '@/components/post-list';
import { TypeColors } from '@/constants/theme';
import type { PostType } from '@/lib/types';

const TYPE_OPTIONS: { value: PostType[]; label: string; color?: string }[] = [
  { value: ['idea'], label: 'Ideas', color: TypeColors.idea },
  { value: ['doubt'], label: 'Doubts', color: TypeColors.doubt },
];

export default function IdeasScreen() {
  return (
    <PostList
      title="Ideas & doubts"
      subtitle="Pitch an idea, or ask the batch for help"
      typeOptions={TYPE_OPTIONS}
      newPostType="idea"
      emptyIcon="bulb-outline"
      emptyText="Nothing here yet. Pitch an idea or ask a doubt with the + button."
    />
  );
}
