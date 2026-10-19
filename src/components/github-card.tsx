import Ionicons from '@expo/vector-icons/Ionicons';
import { openBrowserAsync } from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/posts';

type Repo = {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  pushed_at: string;
};

export function parseRepo(url: string) {
  const match = url.match(/github\.com\/([\w.-]+)\/([\w.-]+)/i);
  return match ? `${match[1]}/${match[2].replace(/\.git$/, '')}` : null;
}

/** Shows live repo stats from the public GitHub API (60 requests/hour per device, no key needed). */
export function GitHubCard({ url }: { url: string }) {
  const theme = useTheme();
  const repoName = parseRepo(url);
  const [repo, setRepo] = useState<Repo | null>(null);

  useEffect(() => {
    if (!repoName) return;
    fetch(`https://api.github.com/repos/${repoName}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setRepo)
      .catch(() => setRepo(null));
  }, [repoName]);

  return (
    <Pressable
      onPress={() => openBrowserAsync(url)}
      style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      <View style={styles.row}>
        <Ionicons name="logo-github" size={20} color={theme.text} />
        <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>
          {repo?.full_name ?? repoName ?? url}
        </ThemedText>
      </View>
      {repo?.description && (
        <ThemedText type="small" themeColor="textSecondary">
          {repo.description}
        </ThemedText>
      )}
      {repo && (
        <View style={styles.row}>
          <ThemedText type="small" themeColor="textSecondary">
            ★ {repo.stargazers_count} · {repo.forks_count} forks
            {repo.language ? ` · ${repo.language}` : ''} · updated {timeAgo(repo.pushed_at)}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
