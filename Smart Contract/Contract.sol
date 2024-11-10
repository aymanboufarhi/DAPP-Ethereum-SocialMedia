// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MiniTwitter {
    struct Post {
        uint256 id;
        address author;
        string content;
        uint256 likes;
        uint256 dislikes;
        uint256 timestamp;
        uint256 lastModified;
        mapping(address => bool) hasLiked;
        mapping(address => bool) hasDisliked;
    }

    // Counter for post IDs
    uint256 private postIdCounter;
    
    // Mapping from post ID to Post struct
    mapping(uint256 => Post) public posts;
    
    // Array to store all post IDs
    uint256[] public postIds;

    // Events
    event PostCreated(uint256 indexed postId, address indexed author, string content, uint256 timestamp);
    event PostEdited(uint256 indexed postId, string newContent, uint256 timestamp);
    event PostLiked(uint256 indexed postId, address indexed liker);
    event PostDisliked(uint256 indexed postId, address indexed disliker);
    event LikeRemoved(uint256 indexed postId, address indexed user);
    event DislikeRemoved(uint256 indexed postId, address indexed user);

    // Modifiers
    modifier postExists(uint256 _postId) {
        require(_postId < postIdCounter, "Post does not exist");
        _;
    }

    modifier onlyAuthor(uint256 _postId) {
        require(posts[_postId].author == msg.sender, "Only the author can perform this action");
        _;
    }

    // Create a new post
    function createPost(string memory _content) public returns (uint256) {
        require(bytes(_content).length > 0, "Content cannot be empty");
        require(bytes(_content).length <= 280, "Content too long");

        uint256 newPostId = postIdCounter++;
        Post storage newPost = posts[newPostId];
        
        newPost.id = newPostId;
        newPost.author = msg.sender;
        newPost.content = _content;
        newPost.timestamp = block.timestamp;
        
        postIds.push(newPostId);

        emit PostCreated(newPostId, msg.sender, _content, block.timestamp);
        return newPostId;
    }

    // Edit an existing post
    function editPost(uint256 _postId, string memory _newContent) 
        public 
        postExists(_postId) 
        onlyAuthor(_postId) 
    {
        require(bytes(_newContent).length > 0, "Content cannot be empty");
        require(bytes(_newContent).length <= 280, "Content too long");

        Post storage post = posts[_postId];
        post.content = _newContent;
        post.lastModified = block.timestamp;

        emit PostEdited(_postId, _newContent, block.timestamp);
    }

    // Like a post
    function likePost(uint256 _postId) public postExists(_postId) {
        Post storage post = posts[_postId];
        
        require(!post.hasLiked[msg.sender], "Already liked this post");
        
        // Remove dislike if exists
        if (post.hasDisliked[msg.sender]) {
            post.dislikes--;
            post.hasDisliked[msg.sender] = false;
            emit DislikeRemoved(_postId, msg.sender);
        }

        post.likes++;
        post.hasLiked[msg.sender] = true;
        
        emit PostLiked(_postId, msg.sender);
    }

    // Dislike a post
    function dislikePost(uint256 _postId) public postExists(_postId) {
        Post storage post = posts[_postId];
        
        require(!post.hasDisliked[msg.sender], "Already disliked this post");
        
        // Remove like if exists
        if (post.hasLiked[msg.sender]) {
            post.likes--;
            post.hasLiked[msg.sender] = false;
            emit LikeRemoved(_postId, msg.sender);
        }

        post.dislikes++;
        post.hasDisliked[msg.sender] = true;
        
        emit PostDisliked(_postId, msg.sender);
    }

    // Get a single post
    function getPost(uint256 _postId) 
        public 
        view 
        postExists(_postId) 
        returns (
            uint256 id,
            address author,
            string memory content,
            uint256 likes,
            uint256 dislikes,
            uint256 timestamp,
            uint256 lastModified
        ) 
    {
        Post storage post = posts[_postId];
        return (
            post.id,
            post.author,
            post.content,
            post.likes,
            post.dislikes,
            post.timestamp,
            post.lastModified
        );
    }

    // Get all posts
    function getAllPosts() public view returns (
        uint256[] memory ids,
        address[] memory authors,
        string[] memory contents,
        uint256[] memory likeCounts,
        uint256[] memory dislikeCounts,
        uint256[] memory timestamps,
        uint256[] memory lastModifieds
    ) {
        uint256 length = postIds.length;
        
        ids = new uint256[](length);
        authors = new address[](length);
        contents = new string[](length);
        likeCounts = new uint256[](length);
        dislikeCounts = new uint256[](length);
        timestamps = new uint256[](length);
        lastModifieds = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            uint256 postId = postIds[i];
            Post storage post = posts[postId];
            
            ids[i] = post.id;
            authors[i] = post.author;
            contents[i] = post.content;
            likeCounts[i] = post.likes;
            dislikeCounts[i] = post.dislikes;
            timestamps[i] = post.timestamp;
            lastModifieds[i] = post.lastModified;
        }

        return (ids, authors, contents, likeCounts, dislikeCounts, timestamps, lastModifieds);
    }

    // Check if user has liked a post
    function hasLiked(uint256 _postId, address _user) public view postExists(_postId) returns (bool) {
        return posts[_postId].hasLiked[_user];
    }

    // Check if user has disliked a post
    function hasDisliked(uint256 _postId, address _user) public view postExists(_postId) returns (bool) {
        return posts[_postId].hasDisliked[_user];
    }
}