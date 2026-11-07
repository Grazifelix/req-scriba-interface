import React from 'react';

const PLACEHOLDER = /(\[A DEFINIR:[^\]]*\])/g;

// Destaca "[A DEFINIR: …]", o que a IA não encontrou nas fontes, como campo a preencher.
export const StoryText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(PLACEHOLDER).map((part, index) =>
      index % 2 === 1 ? (
        <mark key={index} className="px-1 rounded bg-[#fef3c7] text-[#92400e] font-semibold not-italic">
          {part}
        </mark>
      ) : (
        part
      )
    )}
  </>
);
