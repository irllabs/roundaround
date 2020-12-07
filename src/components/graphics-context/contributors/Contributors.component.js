import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { connect } from "react-redux";
import { Color, Vector3 } from 'three';
import { SphereArgs, Round, Layer, Constants } from '../constants';
import { setContributorsPositions } from '../../../redux/actions';
import Contributor from './Contributor.component';

const ContributorsComponent = ({ round, user, collaboration, setContributorsPositions }) => {
    const contributors = useMemo(() => {
        if (!collaboration) return [];
        return Object.entries(collaboration.contributors).reduce((acc, [contributor, data], i, contributorsArray) => {
            const radius = Round.Padding.Interior + (round.layers.length - 1) * Layer.Padding + Round.DashedOutline.Padding;
            let position;
            const contributorHeight = SphereArgs.Contributor[0] + SphereArgs.yPadding
            const totalHeight = contributorHeight * contributorsArray.length
            const yOffset = (totalHeight / 2) - (contributorHeight / 2)
            const x = radius + SphereArgs.xPadding
            const y = (i * -contributorHeight) + yOffset
            const z = 0;
            position = new Vector3(x, y, z);

            acc.push({ position, contributor: { id: contributor, ...data } });
            return acc;

        }, [])
    }, [collaboration, round.layers.length])

    useEffect(() => {
        const contributorsPositions = contributors.reduce((acc, cur) => {
            acc[cur.contributor.id] = cur.position;
            return acc;
        }, {})
        setContributorsPositions(contributorsPositions)
    }, [contributors])

    return (
        <>
            {
                collaboration &&
                contributors.map((contributor, i) =>
                    <Contributor
                        key={i}
                        color={contributor.contributor.color}
                        position={contributor.position}
                    />
                )
            }
        </>
    )

};
const mapStateToProps = state => {
    return {
        round: state.round,
        user: state.user,
        collaboration: state.collaboration
    };
};

export default connect(
    mapStateToProps,
    {
        setContributorsPositions
    }
)(ContributorsComponent);
