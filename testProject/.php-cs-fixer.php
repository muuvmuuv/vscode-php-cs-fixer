<?php

$finder = PhpCsFixer\Finder::create()
  ->exclude('.*/')
  ->exclude('vendor')
  ->in(__DIR__);

return (new PhpCsFixer\Config())
  ->setRules([
    '@PSR12' => true,
  ])
  ->setFinder($finder)
  ->setLineEnding("\n")
  ->setIndent("  ");
