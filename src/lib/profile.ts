import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase, UPLOADS_BUCKET } from '@/lib/supabase';
import type { DirectoryMember, PrivateProfile, Squad } from '@/lib/types';

export const AVATARS_BUCKET = 'avatars';

/** Indian mobile numbers: 10 digits starting 6-9, stored as +91XXXXXXXXXX. Returns null if invalid. */
export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

export function formatPhone(phone: string) {
  return phone.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2');
}

/** "2004-08-15" -> "15 Aug 2004", read as a calendar date (no time zone shift). */
export function formatBirthday(birthday: string, withYear = true) {
  const [year, month, day] = birthday.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

export function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function fetchPrivateProfile() {
  const { data, error } = await supabase.rpc('my_private_profile');
  if (error) throw error;
  return (data ?? { phone: null, birthday: null }) as PrivateProfile;
}

/**
 * Lets the member pick (or take) a square photo, shrinks it to 512 px and uploads it.
 * Returns the public URL, or null if they cancelled.
 */
export async function pickAndUploadAvatar(userId: string, source: 'library' | 'camera') {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 };
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Allow camera access in Settings to take a photo.');
  }
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;

  const image = await ImageManipulator.manipulate(result.assets[0].uri, { maxWidth: 1024, maxHeight: 1024 })
    .resize({ width: 512 })
    .renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });

  // A new file name each time, so cached copies of the old photo don't linger.
  const path = `${userId}/${Date.now()}.jpg`;
  const body = await (await fetch(saved.uri)).arrayBuffer();
  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw error;

  const url = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path).data.publicUrl;
  const { error: updateError } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
  if (updateError) throw updateError;

  await removeOldAvatars(userId, path);
  return url;
}

export async function removeAvatar(userId: string) {
  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
  if (error) throw error;
  await removeOldAvatars(userId, null);
}

async function removeOldAvatars(userId: string, keep: string | null) {
  const { data } = await supabase.storage.from(AVATARS_BUCKET).list(userId);
  const old = (data ?? []).map((file) => `${userId}/${file.name}`).filter((path) => path !== keep);
  if (old.length) await supabase.storage.from(AVATARS_BUCKET).remove(old);
}

export async function fetchDirectory() {
  const { data, error } = await supabase.rpc('member_directory');
  if (error) throw error;
  return data as DirectoryMember[];
}

/** The directory as CSV, for the Admin / CM to share or open in Sheets. */
export function directoryCsv(members: DirectoryMember[]) {
  const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const header = ['Name', 'Email', 'Squad', 'Role', 'Phone', 'Birthday', 'Joined', 'Last seen'];
  const rows = members.map((m) =>
    [m.full_name, m.email, m.squad ?? '', m.role, m.phone ?? '', m.birthday ?? '', m.joined ? 'Yes' : 'No', m.last_seen_at ?? '']
      .map(cell)
      .join(','),
  );
  return [header.map(cell).join(','), ...rows].join('\n');
}

export type LeaderboardPerson = {
  id: string;
  full_name: string;
  squad: Squad | null;
  avatar_url: string | null;
  posts: number;
  likes: number;
  comments: number;
  answers: number;
  points: number;
};

export type Leaderboard = {
  people: LeaderboardPerson[];
  squads: { squad: Squad; points: number; active: number }[];
};

export async function fetchLeaderboard(days: number | null) {
  const { data, error } = await supabase.rpc('leaderboard', { days });
  if (error) throw error;
  return data as Leaderboard;
}

/** Deletes the member's files, then their account and everything they posted. */
export async function deleteMyAccount(userId: string) {
  for (const bucket of [UPLOADS_BUCKET, AVATARS_BUCKET]) {
    const { data } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
    const paths = (data ?? []).map((file) => `${userId}/${file.name}`);
    if (paths.length) await supabase.storage.from(bucket).remove(paths);
  }
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  await supabase.auth.signOut();
}
