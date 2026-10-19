import { PostList } from '@/components/post-list';

export default function IdeasScreen() {
  return (
    <PostList
      title="Ideas"
      subtitle="Pitch it, upvote it, build it together"
      types={['idea']}
      newPostType="idea"
      emptyIcon="bulb-outline"
      emptyText="No ideas yet. Pitch one and find teammates to build it."
    />
  );
}
