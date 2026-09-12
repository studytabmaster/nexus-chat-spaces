# Remix of Connect & Chatv6

Community Chat Platform — 完全版開発プロンプト

Discordのリアルタイムチャットと、Google Classroomのような整理されたコミュニティ管理を組み合わせたWebアプリを作成してください。

ただし学習専用サービスにはしません。

ゲーム、友達、趣味、開発、クリエイター、イベント、オンラインコミュニティなど、何でも使える「コミュニティ型Chat Tool」にしてください。

既存サービスのUIをコピーせず、独自のモダンなUIを作ってください。

1. 最重要方針

まず実際に操作できるMVPを完成させる

モックだけで終わらせない

UIはシンプルで軽量にする

不要なアニメーションを大量に入れない

過剰なライブラリを追加しない

同じコンポーネントを再利用する

レスポンシブ対応

ダークモードを基本とする

将来的にリアルタイム通信へ拡張しやすい設計にする

2. 技術スタック

可能なら以下を使用：

Next.js

React

TypeScript

Tailwind CSS

Supabase

PostgreSQL

認証：

Supabase Auth

データ：

PostgreSQL

リアルタイムチャット：

Supabase Realtime

アイコン：

Lucide Iconsなど軽量なアイコンライブラリ

環境にすでに指定された技術がある場合は、それを優先してください。

3. アプリ全体の構造

PCでは以下の構成：

[コミュニティ一覧] [チャンネル] [メインコンテンツ] [メンバー]

スマホではサイドバーを折りたたみ、画面を切り替える。

4. メインナビゲーション

左端に固定サイドバー。

項目：

Home

Discover

DM

Community一覧

Settings

コミュニティ一覧には参加しているコミュニティのアイコンを表示。

「＋」からコミュニティを作成できる。

5. Home

ログイン後のダッシュボード。

表示：

最近参加したコミュニティ

未読メッセージ

自分のタスク

最近の投稿

オンラインメンバー

カードを使いすぎず、整理されたダッシュボードにする。

6. Discover

公開コミュニティを探すためのページ。

最上部：

「コミュニティを検索…」

検索対象：

名前

説明

タグ

カテゴリー

カテゴリー：

すべて

ゲーム

アニメ

音楽

映画

テクノロジー

プログラミング

AI

クリエイター

イラスト

スポーツ

趣味

雑談

その他

表示セクション：

おすすめ

人気

急上昇

新着

コミュニティカード：

アイコン

名前

説明

カテゴリー

タグ

メンバー数

オンライン人数

Verified

Join

フィルター：

人気順

メンバー数

アクティブ

急上昇

新着

7. コミュニティ詳細

コミュニティをクリックすると詳細ページ。

表示：

アイコン

カバー

名前

説明

メンバー数

オンライン人数

タグ

カテゴリー

Verified

Joinボタン

公開されているチャンネルをプレビュー可能。

Joinするまで正式なメンバーにはしない。

8. コミュニティ作成

「Create Community」

入力：

名前

説明

アイコン

カテゴリー

公開 / 非公開

作成時に自動生成：

CATEGORY:
GENERAL

CHANNEL:

general

作成者はOwnerになる。

9. コミュニティ内部

コミュニティを開くと左側にチャンネル一覧。

例：

GENERAL

general

announcements

CHAT

chat

gaming

memes

PROJECT

ideas

project

カテゴリーは折りたたみ可能。

管理権限があれば、

カテゴリー追加

チャンネル追加

名前変更

削除

ができる。

10. チャット

メイン画面はリアルタイムチャット。

機能：

メッセージ送信

編集

削除

返信

リアクション

メンション

ピン留め

ファイル添付

画像添付

未読表示

タイムスタンプ

メッセージは自然なチャットUI。

不要な巨大カードUIにはしない。

11. 投稿

チャットとは別に「Post」を作成できる。

投稿：

タイトル

本文

画像

ファイル

リンク

コメント

リアクション

作成者

日付

用途：

お知らせ

イベント告知

アップデート

プロジェクト進捗

情報共有

12. タスク

学習用の課題ではなく、コミュニティ用タスク。

例：

イベント画像を作る

動画を編集する

プロジェクトを確認する

タスク：

タイトル

説明

担当者

期限

優先度

ステータス

コメント

添付

ステータス：

TODO
IN PROGRESS
DONE

13. メンバー

右側にメンバー一覧。

オンライン / オフラインを表示。

各メンバー：

アバター

表示名

ステータス

ロール

クリックするとプロフィールを開く。

14. プロフィール

表示：

アバター

ユーザー名

表示名

自己紹介

ステータス

ロール

共通コミュニティ

DM開始ボタンを配置。

15. DM

ユーザー同士の1対1チャット。

DM一覧：

アバター

名前

最終メッセージ

未読数

オンライン状態

DM画面はコミュニティチャットと同じチャットコンポーネントを再利用する。

16. 通知

通知センターを作る。

通知：

メンション

返信

タスク割り当て

投稿コメント

コミュニティ参加承認

未読数をバッジ表示。

17. ロール・権限

基本ロール：

Owner
Admin
Moderator
Member

権限：

コミュニティ設定

チャンネル管理

メンバー管理

メッセージ管理

投稿管理

タスク管理

Ownerはすべての権限を持つ。

18. 公開設定

コミュニティには以下の公開状態を用意。

PRIVATE
検索に表示しない。

UNLISTED
検索には表示しないが招待リンクから参加可能。

PUBLIC
Discoverに表示する。

PUBLICコミュニティだけDiscoverに掲載する。

19. Join Request

申請制コミュニティにも対応。

申請：

ユーザー

コミュニティ

メッセージ

作成日時

status

status：

PENDING
APPROVED
REJECTED

管理者が承認・拒否できる。

20. Verified

公開コミュニティにVerified状態を持たせる。

管理者による確認後だけVerifiedにできる設計。

通常ユーザーが勝手にVerifiedにできない。

21. 検索

全体検索を上部に配置。

検索対象：

メッセージ

コミュニティ

チャンネル

投稿

タスク

ユーザー

検索結果をカテゴリー別に表示。

22. Settings

設定画面：

ACCOUNT

Profile

Username

Avatar

APPEARANCE

Dark / Light

NOTIFICATIONS

メンション

DM

投稿

タスク

PRIVACY

DM設定

オンライン表示

COMMUNITY

管理権限がある場合のみコミュニティ設定を表示

23. データベース

最低限以下のテーブルを設計。

users

id

username

display_name

avatar_url

bio

status

created_at

communities

id

name

description

icon_url

banner_url

category

visibility

is_verified

created_at

community_members

id

community_id

user_id

role

joined_at

categories

id

community_id

name

position

channels

id

community_id

category_id

name

type

position

messages

id

channel_id

user_id

content

created_at

edited_at

message_reactions

id

message_id

user_id

emoji

posts

id

community_id

channel_id

user_id

title

content

created_at

tasks

id

community_id

title

description

assigned_to

due_date

priority

status

created_at

dms

id

created_at

dm_members

id

dm_id

user_id

dm_messages

id

dm_id

user_id

content

created_at

notifications

id

user_id

type

content

read

created_at

join_requests

id

community_id

user_id

message

status

created_at

community_tags

id

community_id

tag

24. セキュリティ

Supabaseを使用する場合はRLSを適切に設定する。

ユーザーは権限のないコミュニティ・チャンネルのデータを取得できないようにする。

Owner/Adminのみ管理操作を実行可能にする。

PRIVATEコミュニティをDiscover APIから取得しない。

25. UIデザイン

ダークモードをデフォルト。

雰囲気：

モダン

シンプル

高級感

少し未来的

SaaS

コミュニティアプリ

色は暗いグレーをベースに、青〜紫系をアクセントにする。

角丸は適度に使用。

余白をしっかり取る。

情報量が多くても見やすいUIにする。

26. レスポンシブ

Desktop：

4カラム

Community
→ Channel
→ Main
→ Members

Tablet：

Community
→ Main
→ Members

Mobile：

1画面表示。

サイドバーはDrawer化。

チャット入力欄は画面下部に固定。

27. 初期データ

開発時にはダミーデータを用意。

例：

コミュニティ：

「Game Hub」
「Minecraft Japan」
「AI Creators」
「Music Lounge」
「Indie Developers」

チャンネル：

general

chat

gaming

announcements

ideas

投稿やメッセージも数件入れて、ログイン後すぐにアプリの完成イメージが分かるようにする。

28. MVPで優先する機能

最優先：

Login / Signup

Home

Community作成

Community一覧

Discover

Community詳細

Join

Channel

Chat

DM

Profile

Settings

次に：

Posts

Tasks

Notifications

Roles

Join Request

Verified

すべてを一度に複雑に作らず、まずMVPを正常動作させる。

29. 重要なUX

ユーザーがログインしたら、

Home
↓
Discover
↓
コミュニティを発見
↓
詳細を見る
↓
Join
↓
コミュニティに追加
↓

general

↓
チャット開始

という流れが自然になるようにする。

「コミュニティを探すこと」と「チャットを始めること」をサービスの中心体験にする。

30. 実装ルール

コードを書く前に既存プロジェクトを確認する。

すでに存在するファイル・コンポーネント・依存関係をできるだけ再利用する。

不要なファイルを増やさない。

同じUIは共通コンポーネント化する。

エラー処理を入れる。

Loading / Empty / Error状態も作る。

モバイル表示も確認する。

ダミーデータだけで動くようにせず、可能な部分は実データに接続する。

ただし、外部APIや複雑なインフラが必要な機能はMVPでは無理に実装せず、後から拡張できる構造にする。

31. 完成条件

最終的にユーザーが、

「アカウント作成」
→「ログイン」
→「Home」
→「Discoverでコミュニティ検索」
→「コミュニティ詳細」
→「Join」
→「チャンネルを見る」
→「メッセージ送信」
→「DM」
→「プロフィール編集」

まで一通り実際に操作できる状態にする。

UIだけのデモではなく、可能な範囲でバックエンド・データベースと接続する。

まずMVPを完成させ、その後に追加機能を実装する。

最優先するのは、
「速い」
「分かりやすい」
「チャットしやすい」
「コミュニティを見つけやすい」
の4点。

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://nexus-chat-spaces.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a505c315-f48f-45a7-bc85-9c16df11ce72).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
