'use strict';
// このファイルは vocal-billing の npm run build-free で作る。直接書き換えない（完全版は vocal-billing/src/songs-full.ts）
// 無料で公開する範囲：mary-lamb・twinkle・kaeru は全部、ほかの曲は最初のフレーズだけ（locked: true。続きは有料版で /api/songs から受け取る）
const SONGS = [
  {
    "id": "mary-lamb",
    "title": "メリーさんのひつじ",
    "composer": "アメリカ民謡",
    "credit": "ミ・レ・ドの3つの音とソだけ。いちばんやさしい歌",
    "time": "4/4",
    "tempo": 96,
    "mel": [
      "e4/q. d4/8 c4/q d4/q",
      "e4/q e4/q e4/h",
      "d4/q d4/q d4/h",
      "e4/q g4/q g4/h",
      "e4/q. d4/8 c4/q d4/q",
      "e4/q e4/q e4/q e4/q",
      "d4/q d4/q e4/q d4/q",
      "c4/w"
    ],
    "phrases": [
      [
        0,
        4
      ],
      [
        4,
        8
      ]
    ]
  },
  {
    "id": "twinkle",
    "title": "きらきら星",
    "composer": "フランス民謡",
    "credit": "ド→ソの5度の跳躍で始まる歌",
    "time": "4/4",
    "tempo": 92,
    "mel": [
      "c4/q c4/q g4/q g4/q",
      "a4/q a4/q g4/h",
      "f4/q f4/q e4/q e4/q",
      "d4/q d4/q c4/h",
      "g4/q g4/q f4/q f4/q",
      "e4/q e4/q d4/h",
      "g4/q g4/q f4/q f4/q",
      "e4/q e4/q d4/h",
      "c4/q c4/q g4/q g4/q",
      "a4/q a4/q g4/h",
      "f4/q f4/q e4/q e4/q",
      "d4/q d4/q c4/h"
    ],
    "phrases": [
      [
        0,
        4
      ],
      [
        4,
        8
      ],
      [
        8,
        12
      ]
    ]
  },
  {
    "id": "kaeru",
    "title": "かえるの合唱",
    "composer": "ドイツ民謡",
    "credit": "ドレミファの順に上がって下がる。後半は同じ音をはっきり切って",
    "time": "4/4",
    "tempo": 100,
    "mel": [
      "c4/q d4/q e4/q f4/q",
      "e4/q d4/q c4/h",
      "e4/q f4/q g4/q a4/q",
      "g4/q f4/q e4/h",
      "c4/q r/q c4/q r/q",
      "c4/q r/q c4/q r/q",
      "c4/8 c4/8 d4/8 d4/8 e4/8 e4/8 f4/8 f4/8",
      "e4/q d4/q c4/h"
    ],
    "phrases": [
      [
        0,
        2
      ],
      [
        2,
        4
      ],
      [
        4,
        6
      ],
      [
        6,
        8
      ]
    ]
  },
  {
    "id": "frere-jacques",
    "title": "フレール・ジャック",
    "composer": "フランス民謡",
    "credit": "「グーチョキパーでなにつくろう」のメロディ。同じ形を2回ずつ",
    "time": "4/4",
    "tempo": 100,
    "mel": [
      "c4/q d4/q e4/q c4/q",
      "c4/q d4/q e4/q c4/q"
    ],
    "phrases": [
      [
        0,
        2
      ]
    ],
    "locked": true,
    "fullPhrases": 4
  },
  {
    "id": "london-bridge",
    "title": "ロンドン橋",
    "composer": "イギリス民謡",
    "credit": "ソから順に下がって、また上がる",
    "time": "4/4",
    "tempo": 108,
    "mel": [
      "g4/q. a4/8 g4/q f4/q",
      "e4/q f4/q g4/h",
      "d4/q e4/q f4/h",
      "e4/q f4/q g4/h"
    ],
    "phrases": [
      [
        0,
        4
      ]
    ],
    "locked": true,
    "fullPhrases": 2
  },
  {
    "id": "ode-to-joy",
    "title": "歓喜の歌",
    "composer": "ベートーヴェン",
    "credit": "交響曲第9番 第4楽章より。となりの音へ順に動く",
    "time": "4/4",
    "tempo": 100,
    "mel": [
      "e4/q e4/q f4/q g4/q",
      "g4/q f4/q e4/q d4/q",
      "c4/q c4/q d4/q e4/q",
      "e4/q. d4/8 d4/h"
    ],
    "phrases": [
      [
        0,
        4
      ]
    ],
    "locked": true,
    "fullPhrases": 4
  },
  {
    "id": "saints",
    "title": "聖者の行進",
    "composer": "アメリカ民謡",
    "credit": "黒人霊歌。休符のあとから入る",
    "time": "4/4",
    "tempo": 108,
    "mel": [
      "r/q c4/q e4/q f4/q",
      "g4/w",
      "r/q c4/q e4/q f4/q",
      "g4/w"
    ],
    "phrases": [
      [
        0,
        4
      ]
    ],
    "locked": true,
    "fullPhrases": 4
  },
  {
    "id": "sakura",
    "title": "さくらさくら",
    "composer": "日本古謡",
    "credit": "日本の古い歌（作者不詳）。ラ・シ・ド・ミ・ファの「都節」の音階",
    "time": "4/4",
    "tempo": 72,
    "mel": [
      "a4/q a4/q b4/h",
      "a4/q a4/q b4/h"
    ],
    "phrases": [
      [
        0,
        2
      ]
    ],
    "locked": true,
    "fullPhrases": 4
  },
  {
    "id": "jingle-bells",
    "title": "ジングルベル",
    "composer": "ピアポント",
    "credit": "サビの16小節（1857年）。同じ音をくり返すところで高さを保つ",
    "time": "4/4",
    "tempo": 120,
    "mel": [
      "e4/q e4/q e4/h",
      "e4/q e4/q e4/h",
      "e4/q g4/q c4/q. d4/8",
      "e4/w"
    ],
    "phrases": [
      [
        0,
        4
      ]
    ],
    "locked": true,
    "fullPhrases": 4
  },
  {
    "id": "happy-birthday",
    "title": "ハッピー・バースデー",
    "composer": "ヒル姉妹",
    "credit": "弱起の付点のリズムと、最後のオクターブの跳躍",
    "time": "3/4",
    "tempo": 96,
    "pickup": true,
    "mel": [
      "g3/8. g3/16",
      "a3/q g3/q c4/q",
      "b3/h g3/8. g3/16"
    ],
    "phrases": [
      [
        0,
        3
      ]
    ],
    "locked": true,
    "fullPhrases": 4
  },
  {
    "id": "brahms-lullaby",
    "title": "ブラームスの子守歌",
    "composer": "ブラームス",
    "credit": "子守歌 Op.49-4。息を長く、なめらかに",
    "time": "3/4",
    "tempo": 84,
    "pickup": true,
    "mel": [
      "e4/8 e4/8",
      "g4/q. e4/8 e4/q",
      "g4/h e4/8 g4/8",
      "c5/q b4/q. a4/8",
      "a4/q g4/q d4/8 e4/8"
    ],
    "phrases": [
      [
        0,
        5
      ]
    ],
    "locked": true,
    "fullPhrases": 4
  },
  {
    "id": "silent-night",
    "title": "きよしこの夜",
    "composer": "グルーバー",
    "credit": "1818年のクリスマスの歌。8分の6拍子（付点4分音符で1拍）",
    "time": "6/8",
    "tempo": 96,
    "click": 1.5,
    "mel": [
      "g4/q. a4/8 g4/q",
      "e4/h.",
      "g4/q. a4/8 g4/q",
      "e4/h."
    ],
    "phrases": [
      [
        0,
        4
      ]
    ],
    "locked": true,
    "fullPhrases": 6
  },
  {
    "id": "hr-leave-the-bill",
    "title": "Leave the Bill",
    "composer": "羽ばたき塾オリジナル",
    "credit": "ハードロック｜70年代のブルース系ハードロック（シャッフル）。ブルース音階の語るような歌い方・掛け声のサビ",
    "time": "4/4",
    "tempo": 119,
    "mel": [
      "g4/16 g4/16 g4/8 bb4/q d5/q d5/8 c5/8",
      "bb4/8 g4/q. r/h",
      "bb4/q d5/8 d5/8 d5/8 c5/8 bb4/8 g4/8",
      "g4/8 g4/q. r/q r/8 bb4/8",
      "bb4/8 a4/8 bb4/8 d5/8 d5/8 g4/8 f4/q",
      "g4/q. r/8 r/h",
      "bb4/8 g4/8 bb4/8 g4/8 bb4/8 g4/8 d5/8 c5/8",
      "bb4/8 g4/q. r/h",
      "r/w",
      "r/w"
    ],
    "lyrics": [
      "You brought a gold watch, I brought",
      "the bill",
      "Your big talk's parked on a bor-",
      "rowed hill I",
      "count your change while you count your",
      "friends",
      "That grin gets ex- pen- sive when pay-",
      "day ends",
      "",
      "",
      "Hey, move it",
      "o- ver, make room for the truth!",
      "You talk like",
      "a king with a hole in your",
      "boot Hey, move it",
      "o- ver, your tab's com- ing due!",
      "I've got the",
      "re- ceipt, and I'm look- ing at",
      "you"
    ],
    "phrases": [
      [
        0,
        10
      ]
    ],
    "locked": true,
    "fullPhrases": 2
  }
];
