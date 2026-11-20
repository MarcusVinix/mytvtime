export type ShowStatus = "watching" | "completed" | "plan_to_watch" | "stopped";
export type MovieStatus = "watchlist" | "watched";

export interface UserShow {
  id: string;
  user_id: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  status: ShowStatus;
  total_episodes: number;
  number_of_seasons: number;
  first_air_date: string | null;
  next_episode_date: string | null;
  updated_at: string;
  created_at: string;
}

export interface WatchedEpisode {
  id: string;
  user_id: string;
  tmdb_show_id: number;
  season_number: number;
  episode_number: number;
  runtime_minutes: number;
  rating: number | null;
  watched_at: string;
}

export interface UserMovie {
  id: string;
  user_id: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  status: MovieStatus;
  runtime_minutes: number;
  rating: number | null;
  watched_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface TmdbMediaItem {
  id: number;
  media_type?: "tv" | "movie" | "person";
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  first_air_date?: string;
  release_date?: string;
}

export interface TmdbEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
  vote_average: number;
}

export interface TmdbSeasonSummary {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
  overview: string;
}

export interface TmdbSeasonDetail extends TmdbSeasonSummary {
  episodes: TmdbEpisode[];
}

export interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface TmdbShowDetail {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string | null;
  last_air_date: string | null;
  status: string;
  vote_average: number;
  number_of_episodes: number;
  number_of_seasons: number;
  episode_run_time: number[];
  genres: { id: number; name: string }[];
  seasons: TmdbSeasonSummary[];
  next_episode_to_air: TmdbEpisode | null;
  last_episode_to_air: TmdbEpisode | null;
  "watch/providers"?: {
    results?: {
      BR?: {
        link?: string;
        flatrate?: TmdbWatchProvider[];
        rent?: TmdbWatchProvider[];
        buy?: TmdbWatchProvider[];
      };
    };
  };
}

export interface TmdbMovieDetail {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  runtime: number | null;
  status: string;
  vote_average: number;
  genres: { id: number; name: string }[];
  "watch/providers"?: {
    results?: {
      BR?: {
        link?: string;
        flatrate?: TmdbWatchProvider[];
        rent?: TmdbWatchProvider[];
        buy?: TmdbWatchProvider[];
      };
    };
  };
}
