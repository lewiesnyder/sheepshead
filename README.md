# Sheepshead

This repo was generated entirely by Claude Code. It took about 15 minutes and cost about $2.00 in token usage.

THe prompt given to Claude in an empty folder was:
```
Let's create a new app. I would like to create a nextjs app for a human to
  play sheepshead against 1-7 "AI" players. For now it will be only a single
  human player, let's stub out the ability to connect to a server for
  additional humans to be able to play togeher. For this first version, let's
  store the stats (wins, losses, no-tricks, num leasters, etc) in local
  storage in the browser. I'd like the UI to look like a card table, have some
   avatars for the players and images of cards.
```
When Claude Code asked for permission to perform a task: run a command in the terminal (create dirs,install dependencies, run the app, etc) or create/update a file, I said yes.

## Player selection
![Start Game](/images/start-game.png)

## 5 handed game
![5 handed game](/images/5-handed.png)


---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
