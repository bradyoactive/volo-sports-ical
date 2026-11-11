import { gql, request as graphqlRequest } from "graphql-request";
import { ICalCalendar } from "ical-generator";
import * as R from "ramda";

const VOLO_GRAPHQL_URL = "https://volosports.com/hapi/v1/graphql";
export const ICAL_KEY = "voloIcal";

type LoginResponse = {
  login: {
    token: string;
  };
};

const loginMutation = gql`
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
  }
}
`;

type CurrentUserGamesResponse = {
  currentUser: {
    game_rsvps: {
      gameByGame: {
        _id: string;
        start_time: string;
        end_time: string;
        venueByVenue: {
          shorthand_name: string;
          formatted_address: string;
          latitude: number;
          longitude: number;
        };
        leagueByLeague: {
          sportBySport: {
            name: string;
          };
        };
      };
    }[];
  };
};

const query = gql`
query CurrentUserGames {
  currentUser {
    game_rsvps {
      gameByGame {
        _id
        start_time
        end_time
        venueByVenue {
          shorthand_name
          formatted_address
          latitude
          longitude
        }
        leagueByLeague {
          sportBySport {
            name
          }
        }
      }
    }
  }
}
`;

type FinalGame = {
  id: string;
  sport: string;
  venue: {
    formatted_address: string;
    shorthand_name: string;
    latitude: number;
    longitude: number;
  };
  start_time: Date;
  end_time: Date;
};

export async function makeAndStoreVoloIcal(env: Env): Promise<string> {
  const authToken = await getAuthToken(env.EMAIL, env.PASSWORD);
  const games = await fetchGames(authToken);
  const iCalContents = buildIcal(games);
  await env.VOLO_SPORTS_ICAL.put(ICAL_KEY, iCalContents);
  return iCalContents;
}

async function getAuthToken(email: string, password: string) {
  const response = await graphqlRequest<LoginResponse>(
    VOLO_GRAPHQL_URL,
    loginMutation,
    { email, password },
  );
  return response.login.token;
}

async function fetchGames(authToken: string): Promise<FinalGame[]> {
  const result = await graphqlRequest<CurrentUserGamesResponse>(
    VOLO_GRAPHQL_URL,
    query,
    undefined,
    { authorization: `Bearer ${authToken}` },
  );

  const games: FinalGame[] = result.currentUser.game_rsvps.map((gameRsvp) => {
    const game = gameRsvp.gameByGame;
    return {
      id: game._id,
      sport: game.leagueByLeague.sportBySport.name,
      venue: game.venueByVenue,
      start_time: new Date(game.start_time),
      end_time: new Date(game.end_time),
    };
  });

  // Back-to-back games at the same venue and sport become one calendar event.
  const gamesByLocation = R.groupBy(
    (game: FinalGame) => `${game.venue.shorthand_name}|${game.sport}`,
    games,
  );
  return Object.values(gamesByLocation).flatMap((group) => {
    if (!group) {
      return [];
    }
    const sortedGames = R.sort(
      (g1, g2) => g1.start_time.getTime() - g2.start_time.getTime(),
      group,
    );
    const merged: FinalGame[] = [];
    for (const game of sortedGames) {
      const lastGame = merged[merged.length - 1];
      if (lastGame && lastGame.end_time.getTime() === game.start_time.getTime()) {
        lastGame.end_time = game.end_time;
      } else {
        merged.push({ ...game });
      }
    }
    return merged;
  });
}

function buildIcal(games: FinalGame[]): string {
  const calendar = new ICalCalendar({
    events: games.map((game) => ({
      id: game.id,
      start: game.start_time,
      end: game.end_time,
      summary: game.sport,
      location: {
        title: game.venue.shorthand_name,
        address: game.venue.formatted_address,
        geo: {
          lat: game.venue.latitude,
          lon: game.venue.longitude,
        },
      },
    })),
  });
  return calendar.toString();
}
