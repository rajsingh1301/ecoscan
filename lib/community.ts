import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { FeedPost, NewPost } from "@/lib/types";

const PHOTO_BUCKET = "cleanup-photos";

export interface Profile {
  id: string;
  username: string;
  avatar_emoji: string;
  city: string | null;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function signInWithGoogle(redirectPath = "/community"): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}${redirectPath}` },
  });
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

/**
 * Creates the profile row on first sign-in, deriving a display name from the
 * Google account so there is no extra setup step for the user.
 */
export async function ensureProfile(user: User, city: string | null): Promise<Profile | null> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, username, avatar_emoji, city")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return existing as Profile;

  const metadata = user.user_metadata as Record<string, unknown> | null;
  const rawName =
    (typeof metadata?.full_name === "string" && metadata.full_name) ||
    (typeof metadata?.name === "string" && metadata.name) ||
    user.email?.split("@")[0] ||
    "EcoScanner";

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ id: user.id, username: rawName.slice(0, 40), city })
    .select("id, username, avatar_emoji, city")
    .single();

  if (error) return null;
  return created as Profile;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

async function uploadPhoto(userId: string, dataUrl: string, suffix: string): Promise<string | null> {
  const supabase = createClient();
  const path = `${userId}/${crypto.randomUUID()}-${suffix}.jpg`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, dataUrlToBlob(dataUrl), { contentType: "image/jpeg", upsert: false });

  if (error) return null;

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export interface ModerationResult {
  allowed: boolean;
  reason: string;
}

export async function moderateImages(images: string[]): Promise<ModerationResult> {
  try {
    const res = await fetch("/api/community/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images }),
    });
    if (!res.ok) return { allowed: false, reason: "Could not check the photos. Please try again." };
    return (await res.json()) as ModerationResult;
  } catch {
    return { allowed: false, reason: "Could not check the photos. Please try again." };
  }
}

export async function createPost(
  user: User,
  city: string,
  post: NewPost
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();

  let beforeUrl: string | null = null;
  let afterUrl: string | null = null;

  if (post.beforeImage && post.afterImage) {
    const moderation = await moderateImages([post.beforeImage, post.afterImage]);
    if (!moderation.allowed) {
      return { ok: false, error: moderation.reason };
    }

    beforeUrl = await uploadPhoto(user.id, post.beforeImage, "before");
    afterUrl = await uploadPhoto(user.id, post.afterImage, "after");

    if (!beforeUrl || !afterUrl) {
      return { ok: false, error: "Could not upload the photos. Please try again." };
    }
  }

  const { error } = await supabase.from("posts").insert({
    user_id: user.id,
    type: post.type,
    caption: post.caption ?? null,
    before_url: beforeUrl,
    after_url: afterUrl,
    items_removed: post.itemsRemoved ?? null,
    xp_earned: post.xpEarned ?? null,
    badge_id: post.badgeId ?? null,
    level_reached: post.levelReached ?? null,
    streak_days: post.streakDays ?? null,
    city,
  });

  if (error) return { ok: false, error: "Could not publish your post. Please try again." };
  return { ok: true };
}

export async function fetchFeed(city: string | null, limit = 50): Promise<FeedPost[]> {
  const supabase = createClient();

  let query = supabase
    .from("feed_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (city) query = query.eq("city", city);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as FeedPost[];
}

export async function getMyReactedPostIds(userId: string): Promise<Set<string>> {
  const supabase = createClient();
  const { data } = await supabase.from("reactions").select("post_id").eq("user_id", userId);
  return new Set((data ?? []).map((row) => (row as { post_id: string }).post_id));
}

export async function toggleReaction(
  userId: string,
  postId: string,
  reacted: boolean
): Promise<boolean> {
  const supabase = createClient();

  if (reacted) {
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    return !error;
  }

  const { error } = await supabase
    .from("reactions")
    .insert({ post_id: postId, user_id: userId, emoji: "👏" });
  return !error;
}

export async function fetchCityLeaderboard(
  limit = 10
): Promise<{ city: string; itemsRemoved: number; posts: number }[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("posts")
    .select("city, items_removed")
    .eq("type", "cleanup")
    .limit(1000);

  if (!data) return [];

  const totals = new Map<string, { itemsRemoved: number; posts: number }>();
  for (const row of data as { city: string; items_removed: number | null }[]) {
    const entry = totals.get(row.city) ?? { itemsRemoved: 0, posts: 0 };
    entry.itemsRemoved += row.items_removed ?? 0;
    entry.posts += 1;
    totals.set(row.city, entry);
  }

  return [...totals.entries()]
    .map(([city, value]) => ({ city, ...value }))
    .sort((a, b) => b.itemsRemoved - a.itemsRemoved)
    .slice(0, limit);
}
