/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

module.exports = {
  docs: [
    'introduction',
    'user-guide',
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/0001-record-architecture-decisions',
        'architecture/0002-hybrid-architecture',
        'architecture/0003-local-first-processing',
        'architecture/0004-streaming-processing',
        'architecture/0005-web-worker-offloading',
      ],
    },
    'ux-audit',
  ],
};
