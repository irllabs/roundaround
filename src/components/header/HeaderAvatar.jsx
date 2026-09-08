import React, { useContext } from 'react'
import { connect } from "react-redux";
import _ from 'lodash'
import { FirebaseContext } from '../../firebase';
import {
	setUser, setRounds, setUsers, setRound, setUserColor
} from '../../redux/actions'
import { AppMenu, AppMenuItem } from './AppMenu'
import { ColorGrid } from './ColorGrid'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

function HeaderAvatar({ user, users, setUser, setRounds, shouldShowMenu, setUsers, setRound, setUserColor }) {
	const firebaseContext = useContext(FirebaseContext)
	const [open, setOpen] = React.useState(false);

	const onSignOutClick = () => {
		firebaseContext.signOut()
		setRounds([])
		setUser(null)
		setRound(null)
		setUsers([])
	}

	const getInitials = (name) => {
		let initials = '??'
		if (!_.isNil(name)) {
			const nameParts = name.split(' ')
			if (nameParts.length > 1) {
				initials = nameParts[0][0] + nameParts[1][0]
			} else {
				initials = name[0]
				if (name.length > 1) {
					initials += name[1]
				}
			}
		}
		return initials
	}

	const onColorChosen = ({ hex }) => {
		setUserColor(hex)
		firebaseContext.updateUser(user.id, { color: hex })
		let usersClone = _.cloneDeep(users)
		let me = _.find(usersClone, { id: user.id })
		me.color = hex
		setUsers(usersClone)
	}

	// The user's own colour is the one value that cannot be a class: it comes out of the
	// database. It is handed to Tailwind as a custom property instead of an inline background,
	// so the border and the fill are still spelled in utilities.
	//
	// The fill carries #757575 as the var()'s fallback because a user can have no colour -- an
	// account made before the picker existed, or a record that failed to write one -- and an
	// unset custom property resolves to nothing at all, which paints the circle transparent and
	// leaves white initials on the header. MUI's Avatar had a name for that case: without an
	// image it added `colorDefault`, `palette.grey[600]` on a dark palette, which is #757575.
	// It is the same grey the rounds-list rows already use for their placeholder avatar.
	const avatar = (
		<Avatar className="size-10 after:hidden" style={{ '--user-color': user.color }}>
			{!_.isNil(user.avatar) && <AvatarImage className="border-2 border-(--user-color)" alt={user.displayName} src={user.avatar} />}
			{/* font-normal because the Button around this one is font-medium and MUI's Avatar set
			    no weight at all, so the initials came out at the body's 400. */}
			<AvatarFallback className="bg-(--user-color,#757575) text-[20px] font-normal leading-none text-white">{getInitials(user.displayName)}</AvatarFallback>
		</Avatar>
	)

	return (
		<div className="flex">
			<div data-test="header">
				{/* `contentClassName` carries the 16px right margin the JSS gave every menu paper.
				    That margin is the whole reason this menu sits 8px left of its trigger's centre:
				    Radix centres the wrapper around the paper, and the wrapper is 16px the wider of
				    the two. `alignOffset` cannot do it — floating-ui ignores the alignment axis when
				    there is no alignment, which is exactly what align="center" is. */}
				{
					shouldShowMenu &&
					<AppMenu
						open={open}
						onOpenChange={setOpen}
						listId="menu-list-grow"
						label="Account"
						align="center"
						trigger={
							// 64px, not the 48px of `icon-round`: MUI's IconButton is 12px of padding
							// around its content, and the content here is a 40px avatar, not a 24px
							// glyph. The baseline puts the avatar at x 1104-1143 on 05-round.png,
							// which only a 64px button produces.
							<Button className="signed-in size-16" variant="plain" size="icon-round" aria-haspopup="menu" data-test="button-sign-in-out">
								{avatar}
							</Button>
						}
						listClassName="py-0"
						contentClassName="mr-4 w-auto"
					>
						<h2 className="mx-4 mb-0 mt-0 pt-4 text-[1.5em] font-bold">{user.displayName}</h2>
						{/* Rendered even for a guest, who has no email: the empty heading still
						    contributes its bottom margin, which is part of the gap between the
						    name and the colour grid on 11-avatar-menu.png. That margin is now
						    spelled out as mb-[1em] rather than leaning on the browser default. */}
						<h3 className="mx-4 mt-0 mb-[1em] text-[1.17em] font-medium">{user.email}</h3>
						<ColorGrid onChange={onColorChosen} />
						<Separator className="bg-white/12" />
						<div className="py-2">
							<AppMenuItem onClick={onSignOutClick} data-test="button-sign-out" className="py-4">Sign out</AppMenuItem>
						</div>
					</AppMenu>
				}
				{
					!shouldShowMenu &&
					<Button variant="plain" size="icon-round" disabled className="size-16 disabled:text-white/30 disabled:opacity-100">
						{avatar}
					</Button>
				}
			</div>
		</div>
	);
}
export default connect(
	null,
	{
		setUser,
		setUsers,
		setRound,
		setRounds,
		setUserColor
	}
)(HeaderAvatar);
