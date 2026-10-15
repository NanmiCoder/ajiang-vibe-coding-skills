import React from 'react';
// 每写完一段，在这里登记：key 对应 segments.json 里的 seg0、seg1……
// 没登记的段会显示占位页。
// import {Seg0} from './Seg0';

export type SegProps = {voice?: boolean};

export const registry: Record<string, React.FC<SegProps>> = {
  // seg0: Seg0,
};
