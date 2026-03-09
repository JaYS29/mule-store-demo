"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { gqlRequest } from "@/lib/graphql";
import {
  FOLLOW_STORE_MUTATION,
  STORE_FOLLOW_QUERY,
  UNFOLLOW_STORE_MUTATION,
} from "@/queries/shopQueries";

type Props = {
  storeId: string;
  initialFollowing: boolean;
  initialFollowersCount: number;
};

type FollowResponse = {
  storeById: {
    id: string;
    isFollowing: boolean;
  } | null;
};

type FollowMutationResponse = {
  followStore: {
    id: string;
    followersCount: number;
    isFollowing: boolean;
  } | null;
};

type UnfollowMutationResponse = {
  unfollowStore: {
    id: string;
    followersCount: number;
    isFollowing: boolean;
  } | null;
};

export default function StoreFollowButton({
  storeId,
  initialFollowing,
  initialFollowersCount,
}: Props) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [isLoading, setIsLoading] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    let active = true;
    gqlRequest<FollowResponse>(STORE_FOLLOW_QUERY, { id: storeId })
      .then((data) => {
        if (!active || !data?.storeById) return;
        setIsFollowing(Boolean(data.storeById.isFollowing));
      })
      .catch(() => {
        if (active) {
          setNeedsLogin(true);
        }
      });
    return () => {
      active = false;
    };
  }, [storeId]);

  const toggleFollow = async () => {
    setIsLoading(true);
    setNeedsLogin(false);
    try {
      if (isFollowing) {
        const result = await gqlRequest<UnfollowMutationResponse>(
          UNFOLLOW_STORE_MUTATION,
          {
            storeId,
          }
        );
        const unfollowStore = result?.unfollowStore;
        setIsFollowing(Boolean(unfollowStore?.isFollowing));
        if (unfollowStore?.followersCount !== undefined) {
          setFollowersCount(unfollowStore.followersCount);
        } else {
          setFollowersCount((count) => Math.max(0, count - 1));
        }
      } else {
        const result = await gqlRequest<FollowMutationResponse>(
          FOLLOW_STORE_MUTATION,
          {
            storeId,
          }
        );
        const followStore = result?.followStore;
        setIsFollowing(Boolean(followStore?.isFollowing));
        if (followStore?.followersCount !== undefined) {
          setFollowersCount(followStore.followersCount);
        } else {
          setFollowersCount((count) => count + 1);
        }
      }
    } catch {
      setNeedsLogin(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <span>{followersCount} followers</span>
      {needsLogin ? (
        <Link
          href="/signin"
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-400"
        >
          Sign in to follow
        </Link>
      ) : (
        <button
          type="button"
          onClick={toggleFollow}
          disabled={isLoading}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            isFollowing
              ? "border border-gray-300 text-gray-900 hover:border-gray-400"
              : "bg-gray-900 text-white hover:bg-gray-800"
          }`}
        >
          {isFollowing ? "Unfollow" : "Follow"}
        </button>
      )}
    </>
  );
}
