import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';

export type StorageBucket = 'team-logos' | 'player-photos';

/**
 * Online-only image picker and uploader (ADR-17).
 * Returns the public URL of the uploaded image, or null if cancelled.
 */
export async function pickAndUploadImage(
  bucket: StorageBucket,
  prefix: string,
): Promise<string | null> {
  const net = await NetInfo.fetch();
  if (!net.isConnected || net.isInternetReachable === false) {
    throw new Error('Image upload is online-only. Connect to the internet to upload photos.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset) return null;
  const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${prefix}_${Date.now()}.${ext}`;

  // Read binary blob
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(filePath, arrayBuffer, {
    contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
    upsert: true,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}
