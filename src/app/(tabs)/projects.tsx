import { PostList } from '@/components/post-list';

export default function ProjectsScreen() {
  return (
    <PostList
      title="Projects"
      subtitle="What the batch is building"
      types={['project']}
      newPostType="project"
      emptyIcon="rocket-outline"
      emptyText="No projects yet. Show off what you built, with a GitHub link."
    />
  );
}
