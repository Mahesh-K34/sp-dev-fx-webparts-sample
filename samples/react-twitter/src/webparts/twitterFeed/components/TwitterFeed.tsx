import * as React from 'react';
import styles from './TwitterFeed.module.scss';
import { ITwitterFeedProps } from './ITwitterFeedProps';
import { TwitterTimelineEmbed } from 'react-twitter-embed';

const TwitterFeed = (props: ITwitterFeedProps): React.ReactElement<ITwitterFeedProps> => {
  const {
    sourceType,
    screenName,
    userId,
    ownerScreenName,
    slug,
    id,
    url,
    autoHeight,
    theme,
    borderColor,
    noHeader,
    noFooter,
    noBorders,
    noScrollbar,
    lang,
    width,
    height,
    tweetLimit
  } = props;

  return (
    <div className={ styles.twitterFeed }>
      <TwitterTimelineEmbed
        sourceType={sourceType}
        screenName={screenName}
        userId={userId}
        ownerScreenName={ownerScreenName}
        slug={slug}
        id={id}
        url={url}
        autoHeight={autoHeight}
        theme={theme}
        borderColor={borderColor}
        noHeader={noHeader}
        noFooter={noFooter}
        noBorders={noBorders}
        noScrollbar={noScrollbar}
        lang={lang || 'en'}
        options={{
          height: autoHeight ? undefined : height,
          width: width,
          tweetLimit: tweetLimit
        }} />
    </div>
  );
};

export default TwitterFeed;
