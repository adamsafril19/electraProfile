import React from 'react';
import { Text, TextProps } from 'react-native';

// Teks konten ditulis dengan penanda ringan: **tebal** dan *miring*.
// Tanpa pengurai ini tanda bintang tampil mentah di halaman.
const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

export const RichText: React.FC<TextProps & { children: string; boldStyle?: any }> = ({ children, boldStyle, style, ...rest }) => {
  const parts = children.split(TOKEN).filter((p) => p !== '');
  return (
    <Text style={style} {...rest}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return (
            <Text key={i} style={[{ fontWeight: '800' }, boldStyle]}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return (
            <Text key={i} style={{ fontStyle: 'italic' }}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </Text>
  );
};
