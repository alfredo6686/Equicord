import {
	addBadge,
	BadgePosition,
	type BadgeUserArgs,
	type ProfileBadge,
	removeBadge,
} from "@api/Badges";
import definePlugin, { OptionType } from "@utils/types";
import { React, Tooltip } from "@webpack/common";

type CustomBadge =
	| string
	| {
			name: string;
			badge: string;
			custom?: boolean;
	  };

interface BadgeCache {
	badges: {
		[mod: string]: CustomBadge[];
	};
	expires: number;
}

const API_URL = "https://badge.ipv4-army.workers.dev";

const cache = new Map<string, BadgeCache>();
const EXPIRES = 1000 * 60 * 15;

async function fetchBadges(
	id: string,
): Promise<BadgeCache["badges"] | undefined> {
	const cachedValue = cache.get(id);
	if (!cache.has(id) || (cachedValue && cachedValue.expires < Date.now())) {
		const resp = await fetch(`${API_URL}/users/${id}`);
		const body = (await resp.json()) as BadgeCache["badges"];
		cache.set(id, { badges: body, expires: Date.now() + EXPIRES });
		return body;
	} else if (cachedValue) {
		return cachedValue.badges;
	}
}

function BadgeComponent({ name, img }: { name: string; img: string }) {
	return (
		<Tooltip text={name}>
			{(tooltipProps: any) => (
				<img
					{...tooltipProps}
					src={img}
					style={{
						width: "20px",
						height: "20px",
						transform: name.includes("Replugged") ? "scale(0.9)" : null,
					}}
				/>
			)}
		</Tooltip>
	);
}

function GlobalBadges({ userId }: BadgeUserArgs) {
	const [badges, setBadges] = React.useState<BadgeCache["badges"]>({});
	React.useEffect(() => {
		fetchBadges(userId).then(setBadges);
	}, []);

	if (!badges || !Object.keys(badges).length) return null;
	const globalBadges: JSX.Element[] = [];

	Object.keys(badges).forEach((mod) => {
		if (mod.toLowerCase() === "equicord") return; // I give up, and I don't use Vencord
		badges[mod].forEach((badge) => {
			if (typeof badge === "string") {
				const fullNames = { hunter: "Bug Hunter", early: "Early User" };
				badge = {
					name: fullNames[badge as string] ? fullNames[badge as string] : badge,
					badge: `${API_URL}/badges/${mod}/${(badge as string).replace(mod, "").trim().split(" ")[0]}`,
				};
			} else if (typeof badge === "object") badge.custom = true;
			if (!showCustom() && badge.custom) return;
			const cleanName = badge.name.replace(mod, "").trim();
			const prefix = showPrefix() ? mod : "";
			if (!badge.custom)
				badge.name = `${prefix} ${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}`;
			globalBadges.push(<BadgeComponent name={badge.name} img={badge.badge} />);
		});
	});

	return <>{globalBadges}</>;
}

const Badge: ProfileBadge = {
	component: GlobalBadges,
	position: BadgePosition.START,
};

const showPrefix = () => Vencord.Settings.plugins.GlobalBadges.showPrefix;
const showCustom = () => Vencord.Settings.plugins.GlobalBadges.showCustom;

export default definePlugin({
	name: "GlobalBadgesReloaded",
	description:
		"Adds global badges from other client mods, with Cloudflare Workers.",
	authors: [{ name: "S€th", id: 1273447359417942128n }],

	start: () => addBadge(Badge),
	stop: () => removeBadge(Badge),

	options: {
		showPrefix: {
			type: OptionType.BOOLEAN,
			description: "Shows the Mod as Prefix",
			default: true,
			restartNeeded: false,
		},
		showCustom: {
			type: OptionType.BOOLEAN,
			description: "Show Custom Badges",
			default: true,
			restartNeeded: false,
		},
	},
});
