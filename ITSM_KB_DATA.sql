{
  "SQL": "SELECT TOP (
    CASE
        WHEN ISNULL(@Keyword, '') = ''
         AND ISNULL(@Topic, '') = ''
         AND NULLIF(LTRIM(RTRIM(@RecordCount)), '') IS NULL
        THEN 10

        WHEN TRY_CONVERT(
            INT,
            NULLIF(LTRIM(RTRIM(@RecordCount)), '')
        ) IS NOT NULL
        THEN TRY_CONVERT(
            INT,
            NULLIF(LTRIM(RTRIM(@RecordCount)), '')
        )

        ELSE 2147483647
    END
)
    S.Title,
    S.Content,
    T.TopicName,
    S.Keywords,
    S.SolutionID,
    S.CreatedDate,
    S.RecordID
FROM TBL#Solutions AS S

LEFT JOIN TBL#Topic AS T
    ON CAST(S.Topic AS NVARCHAR(MAX))
       LIKE '%' + CAST(T.RecordID AS NVARCHAR(255)) + '%'

WHERE
    S.[IsApproved?] = 1

    AND (
        ISNULL(@Topic, '') = ''
        OR T.TopicName = @Topic
    )

    AND (
        ISNULL(@Keyword, '') = ''
        OR S.Title LIKE '%' + @Keyword + '%'
        OR S.Content LIKE '%' + @Keyword + '%'
        OR S.Keywords LIKE '%' + @Keyword + '%'
        OR S.Topic LIKE '%' + @Keyword + '%'
        OR S.SolutionID LIKE '%' + @Keyword + '%'
    )

ORDER BY
    S.CreatedDate DESC;",
  "Tables": [
    "Solutions",
    "Topic"
  ]
}