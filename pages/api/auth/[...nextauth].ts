// NextAuth.js configuration with Discord provider
import NextAuth, { NextAuthOptions } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { adminDb } from '@/libs/firebase-admin';

export const authOptions: NextAuthOptions = {
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: 'identify email',
                },
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === 'discord' && profile) {
                try {
                    const discordProfile = profile as {
                        id: string;
                        username: string;
                        avatar?: string;
                    };

                    // Check if user exists in Firestore
                    const userRef = adminDb.collection('users').doc(discordProfile.id);
                    const userDoc = await userRef.get();

                    if (!userDoc.exists) {
                        // Create new user document
                        await userRef.set({
                            uid: discordProfile.id,
                            discordId: discordProfile.id,
                            discordUsername: discordProfile.username,
                            discordAvatar: user.image || null, // Use the URL provided by NextAuth
                            email: user.email || null,
                            xidClaims: [],
                            role: 'user',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        });
                    } else {
                        // Update existing user
                        await userRef.update({
                            discordUsername: discordProfile.username,
                            discordAvatar: user.image || null,
                            email: user.email || null,
                            updatedAt: new Date(),
                        });
                    }
                } catch (error) {
                    console.error('Error saving user to Firestore:', error);
                    // Don't block sign-in on Firestore errors
                }
            }
            return true;
        },
        async jwt({ token, account, profile }) {
            if (account && profile) {
                const discordProfile = profile as { id: string };
                token.discordId = discordProfile.id;

                // Fetch user role and xidClaims from Firestore
                try {
                    const userDoc = await adminDb
                        .collection('users')
                        .doc(discordProfile.id)
                        .get();

                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        token.role = userData?.role || 'user';
                        token.xidClaims = userData?.xidClaims || [];
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    token.role = 'user';
                    token.xidClaims = [];
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).discordId = token.discordId;
                (session.user as any).role = token.role;
                (session.user as any).xidClaims = token.xidClaims;
            }
            return session;
        },
    },
    pages: {
        signIn: '/auth/signin',
        error: '/auth/error',
    },
    session: {
        strategy: 'jwt',
    },
};

export default NextAuth(authOptions);
