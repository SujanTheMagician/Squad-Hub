import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PostCard } from '@/components/post-card';
import { ThemedText } from '@/components/themed-text';
import { ChipGroup } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SquadSelector } from '@/components/ui/squad-selector';
import { TextField } from '@/components/ui/text-field';
import { BrandGradient, MaxContentWidth, Radius, Spacing, TabBarSpace } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchPosts, type SquadFilter } from '@/lib/posts';
import type { FeedPost, PostType } from '@/lib/types';

type PostListProps = {
  title: string;
  subtitle?: string;
  types?: PostType[];
  newPostType: PostType;
  emptyIcon: React.ComponentProps<typeof Ionicons>['name'];
  emptyText: string;
  /** Replaces the default title block (used by Home for its greeting). */
  hero?: ReactNode;
  header?: ReactNode;
  /** Extra chips (e.g. Notes vs Resources) rendered under the squad selector. */
  typeOptions?: { value: PostType[]; label: string; color?: string }[];
};

export function PostList({
  title,
  subtitle,
  types,
  newPostType,
  emptyIcon,
  emptyText,
  hero,
  header,
  typeOptions,
}: PostListProps) {
  const theme = useTheme();
  const [squad, setSquad] = useState<SquadFilter>('all');
  const [selectedTypes, setSelectedTypes] = useState<PostType[] | undefined>(typeOptions?.[0].value ?? types);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setPosts(await fetchPosts({ types: selectedTypes, squad, search }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTypes, squad, search]);

  // Reload whenever the tab comes back into view (e.g. after posting).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Animated.FlatList
          data={posts}
          keyExtractor={(post) => post.id}
          renderItem={({ item, index }) => <PostCard post={item} index={index} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              tintColor={theme.primary}
              colors={[theme.primary]}
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              {hero ?? (
                <Animated.View entering={FadeInDown.duration(500)}>
                  <ThemedText type="subtitle">{title}</ThemedText>
                  {subtitle && <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>}
                </Animated.View>
              )}
              {header}
              <TextField
                icon="search"
                value={searchInput}
                onChangeText={(text) => {
                  setSearchInput(text);
                  if (!text) setSearch('');
                }}
                placeholder="Search titles, subjects, descriptions"
                returnKeyType="search"
                onSubmitEditing={() => setSearch(searchInput)}
              />
              <SquadSelector value={squad} onChange={setSquad} />
              {typeOptions && (
                <ChipGroup
                  options={typeOptions.map((option) => ({ value: option.label, label: option.label, color: option.color }))}
                  value={typeOptions.find((option) => option.value === selectedTypes)?.label ?? ''}
                  onChange={(label) => setSelectedTypes(typeOptions.find((option) => option.label === label)?.value)}
                />
              )}
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={theme.primary} style={styles.empty} />
            ) : (
              <Animated.View entering={FadeIn.duration(400)} style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name={error ? 'cloud-offline-outline' : emptyIcon} size={32} color={theme.primary} />
                </View>
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  {error ?? emptyText}
                </ThemedText>
              </Animated.View>
            )
          }
        />

        <PressableScale
          accessibilityLabel="Share something"
          scaleTo={0.9}
          onPress={() => router.push({ pathname: '/new-post', params: { type: newPostType } })}
          style={[styles.fab, { shadowColor: theme.primary }]}>
          <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabFill}>
            <Ionicons name="add" size={30} color="#FFFFFF" />
          </LinearGradient>
        </PressableScale>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: TabBarSpace + Spacing.six,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: TabBarSpace,
    borderRadius: Radius.lg,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabFill: {
    width: 60,
    height: 60,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
