import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { colors } from "../theme";

interface AvatarProps {
  name: string | null;
  size?: number;
  photoUrl?: string | null;
  uri?: string | null;
}

const avatarColors = [
  { bg: "rgba(139, 61, 255, 0.15)", text: colors.primary },
  { bg: colors.successSoft, text: colors.success },
  { bg: "rgba(59, 130, 246, 0.10)", text: "#3b82f6" },
  { bg: colors.warningSoft, text: colors.warning },
  { bg: colors.errorSoft, text: colors.error },
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ name, size = 40, photoUrl, uri }: AvatarProps) {
  const imageUrl = photoUrl || uri;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        contentFit="cover"
        transition={200}
      />
    );
  }

  const colorSet = name
    ? avatarColors[hashName(name) % avatarColors.length]
    : avatarColors[0];

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colorSet.bg,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.36, color: colorSet.text }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    backgroundColor: colors.border,
  },
  text: {
    fontWeight: "600",
  },
});
